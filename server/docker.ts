import { execFile } from "node:child_process"
import { stat } from "node:fs/promises"
import { hostname } from "node:os"
import { dirname } from "node:path"
import { promisify } from "node:util"

import { SystemSettingKey } from "@/constants/systemSettings"

import { getProjectHostRoot, getProjectRoot } from "@/server/getProjectPaths"
import { getCachedSystemSettingValue } from "@/server/systemSettings"

import { ClientError } from "@/utils/clientError"

const execFileAsync = promisify(execFile)

/** Docker compose 配置文件标签 */
export const DockerComposeConfigFilesLabel = "com.docker.compose.project.config_files"

/** Docker 项目名称标签 */
export const DockerComposeProjectLabel = "com.docker.compose.project"

/** Docker 路径映射 */
export interface DockerPathMapping {
    from: string
    to: string
}

/** Docker 命令执行结果 */
export interface DockerCommandResult {
    stdout: string
    stderr: string
}

/** Docker 命令参数 */
export interface RunDockerCommandParams {
    args: string[]
    cwd?: string
    env?: Record<string, string | undefined>
    errorMessage?: string
}

export interface BuildDockerImageParams {
    cwd: string
    name: string
}

function isBuildKitUnavailableError(error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    const lowerMessage = message.toLowerCase()

    return (
        lowerMessage.includes("buildkit") &&
        (lowerMessage.includes("not supported") ||
            lowerMessage.includes("unknown flag") ||
            lowerMessage.includes("failed to solve") ||
            lowerMessage.includes("component is missing"))
    )
}

/** Compose 文件解析结果 */
export interface ResolvedComposeFilesResult {
    cwd: string
    files: string[]
    sourceFiles: string[]
}

/** 当前容器项目信息 */
export interface CurrentDockerComposeProject {
    containerId: string
    composeFiles: string[]
    projectName?: string
}

/** Docker 标签映射 */
export interface DockerLabelMap {
    [key: string]: string
}

/** 命令执行异常 */
export interface DockerExecError extends Error {
    stdout?: string | Buffer
    stderr?: string | Buffer
}

/** 路径异常 */
export interface DockerPathError extends Error {
    code?: string
}

function normalizeExecOutput(value?: string | Buffer) {
    if (typeof value === "string") return value
    return value?.toString() ?? ""
}

function normalizeComparablePath(value: string) {
    return value.trim().replace(/\\/g, "/").replace(/\/+/g, "/").replace(/\/$/u, "").toLowerCase()
}

function normalizeTargetPath(value: string) {
    return value.trim().replace(/\\/g, "/").replace(/\/+/g, "/").replace(/\/$/u, "")
}

function parseDockerPathMappingsFromJson(value: string) {
    try {
        const parsed = JSON.parse(value) as DockerPathMapping[]

        if (!Array.isArray(parsed)) return []

        return parsed
            .map(item => ({
                from: item?.from?.trim() ?? "",
                to: item?.to?.trim() ?? "",
            }))
            .filter(item => item.from && item.to)
    } catch {
        return []
    }
}

function parseDockerPathMappingsFromText(value: string) {
    return value
        .split(/\r?\n|\|\|/u)
        .map(item => item.trim())
        .filter(Boolean)
        .map(item => {
            const separatorIndex = item.indexOf("=>")
            if (separatorIndex < 0) return undefined

            const from = item.slice(0, separatorIndex).trim()
            const to = item.slice(separatorIndex + 2).trim()

            if (!from || !to) return undefined

            return {
                from,
                to,
            } as DockerPathMapping
        })
        .filter((item): item is DockerPathMapping => !!item)
}

/** 读取 Docker 路径映射 */
export function getDockerPathMappings() {
    const raw = getCachedSystemSettingValue(SystemSettingKey.Docker路径映射)?.trim()
    if (!raw) return []

    const mappings = raw.startsWith("[") ? parseDockerPathMappingsFromJson(raw) : parseDockerPathMappingsFromText(raw)

    return mappings.sort((first, second) => second.from.length - first.from.length)
}

/** 读取项目根目录的内置 Docker 路径映射 */
function getProjectRootDockerPathMappings() {
    const from = getProjectHostRoot()
    const to = getProjectRoot()

    if (normalizeComparablePath(from) === normalizeComparablePath(to)) return []

    return [
        {
            from,
            to,
        } as DockerPathMapping,
    ]
}

/** 读取所有可用于当前运行环境的 Docker 路径映射 */
export function getDockerHostPathMappings() {
    const mappings = [...getDockerPathMappings(), ...getProjectRootDockerPathMappings()]

    return mappings.sort((first, second) => second.from.length - first.from.length)
}

/** 将宿主机路径映射到当前运行环境可访问的路径 */
export function mapDockerHostPath(path: string) {
    const cleanPath = path.trim()
    if (!cleanPath) return cleanPath

    const normalizedPath = normalizeTargetPath(cleanPath)
    const comparablePath = normalizeComparablePath(cleanPath)

    for (const mapping of getDockerHostPathMappings()) {
        const normalizedSourcePath = normalizeTargetPath(mapping.from)
        const normalizedSource = normalizeComparablePath(mapping.from)

        if (comparablePath !== normalizedSource && !comparablePath.startsWith(`${normalizedSource}/`)) continue

        const suffix = normalizedPath.slice(normalizedSourcePath.length)
        return `${normalizeTargetPath(mapping.to)}${suffix}`
    }

    return cleanPath
}

function normalizeComposeFiles(files: string[]) {
    const items = files.map(item => item.trim()).filter(Boolean)
    return Array.from(new Set(items))
}

async function getFileStat(path: string) {
    try {
        return await stat(path)
    } catch (error) {
        const pathError = error as DockerPathError
        if (pathError?.code === "ENOENT") return undefined
        throw error
    }
}

/** 解析当前运行环境实际可访问的 compose 文件路径 */
export async function resolveComposeFilePath(path: string) {
    const cleanPath = path.trim()
    if (!cleanPath) throw new ClientError("compose 文件无效")

    const mappedPath = mapDockerHostPath(cleanPath)
    const candidatePaths = Array.from(new Set([mappedPath, cleanPath]))

    for (const candidatePath of candidatePaths) {
        const fileStat = await getFileStat(candidatePath)
        if (!fileStat) continue
        if (!fileStat.isFile()) throw new ClientError(`compose 文件无效：${cleanPath}`)
        return candidatePath
    }

    const hint = getDockerHostPathMappings().length
        ? "，请确认宿主机目录挂载、项目根目录或 Docker 路径映射配置正确"
        : "，如果当前应用运行在容器中，请挂载宿主机目录并配置 DOCKER_PATH_MAPPINGS"

    throw new ClientError(`compose 文件不存在：${cleanPath}${hint}`)
}

/** 解析 compose 文件列表 */
export async function resolveComposeFiles(files: string[]) {
    const sourceFiles = normalizeComposeFiles(files)
    if (sourceFiles.length === 0) throw new ClientError("compose 文件无效")

    const resolvedFiles = await Promise.all(sourceFiles.map(resolveComposeFilePath))

    return {
        cwd: dirname(resolvedFiles[0]),
        files: resolvedFiles,
        sourceFiles,
    } as ResolvedComposeFilesResult
}

/** 执行 Docker 命令 */
export async function runDockerCommand({ args, cwd, env, errorMessage = "Docker 命令执行失败" }: RunDockerCommandParams) {
    try {
        const result = await execFileAsync("docker", args, {
            cwd,
            env: {
                ...process.env,
                ...env,
            },
            maxBuffer: 20 * 1024 * 1024,
        })

        return {
            stdout: result.stdout ?? "",
            stderr: result.stderr ?? "",
        } as DockerCommandResult
    } catch (error) {
        const execError = error as DockerExecError
        const stdoutText = normalizeExecOutput(execError.stdout)
        const stderrText = normalizeExecOutput(execError.stderr)
        const messageText = execError.message ?? ""
        const output = `${stdoutText}${stderrText}${messageText}`.trim()

        throw new ClientError(output || errorMessage)
    }
}

/** 构建 Docker 镜像 */
export async function buildDockerImage({ cwd, name }: BuildDockerImageParams) {
    try {
        const result = await runDockerCommand({
            args: ["build", "-t", name, "."],
            cwd,
            env: {
                DOCKER_BUILDKIT: "1",
                BUILDKIT_PROGRESS: "plain",
            },
            errorMessage: "构建镜像失败",
        })

        return `${result.stdout}${result.stderr}`.trim()
    } catch (error) {
        if (!isBuildKitUnavailableError(error)) throw error

        const result = await runDockerCommand({
            args: ["build", "-t", name, "."],
            cwd,
            errorMessage: "构建镜像失败",
        })

        return `${result.stdout}${result.stderr}`.trim()
    }
}

/** 当前管理系统所在容器 ID */
export function getCurrentDockerContainerId() {
    const currentHostname = hostname().trim()
    return /^[0-9a-f]{12,64}$/u.test(currentHostname) ? currentHostname : undefined
}

/** 判断是否为当前管理系统所在容器 */
export function isCurrentDockerContainerId(id?: string) {
    const containerId = id?.trim()
    const currentContainerId = getCurrentDockerContainerId()

    if (!containerId || !currentContainerId) return false

    return containerId === currentContainerId || containerId.startsWith(currentContainerId) || currentContainerId.startsWith(containerId)
}

/** 校验不能操作当前管理系统所在容器 */
export function ensureNotCurrentDockerContainer(id?: string) {
    if (!isCurrentDockerContainerId(id)) return
    throw new ClientError("不能操作当前管理系统所在的容器，请改为在宿主机上处理")
}

/** 解析 Docker 标签 */
export function parseDockerLabels(labels?: string) {
    const result: DockerLabelMap = {}

    if (!labels) return result

    labels
        .split(",")
        .map(item => item.trim())
        .filter(Boolean)
        .forEach(item => {
            const [key, ...rest] = item.split("=")
            const value = rest.join("=")
            if (!key) return
            result[key] = value
        })

    return result
}

/** 从标签中提取 compose 文件列表 */
export function getComposeConfigFilesByLabels(labels?: string) {
    const map = parseDockerLabels(labels)
    return getComposeConfigFilesByLabelMap(map)
}

function getComposeConfigFilesByLabelMap(map: DockerLabelMap) {
    const raw = map[DockerComposeConfigFilesLabel]
    if (!raw) return []

    return raw
        .split(",")
        .map(item => item.trim())
        .filter(Boolean)
}

/** 从标签中提取 compose 项目名 */
export function getComposeProjectNameByLabels(labels?: string) {
    const map = parseDockerLabels(labels)
    return map[DockerComposeProjectLabel]
}

/** 获取当前管理系统所在 compose 项目信息 */
export async function getCurrentDockerComposeProject() {
    const containerId = getCurrentDockerContainerId()
    if (!containerId) return undefined

    try {
        const result = await runDockerCommand({
            args: ["container", "inspect", containerId, "--format", "{{json .Config.Labels}}"],
            errorMessage: "读取当前容器信息失败",
        })

        const labels = (JSON.parse(result.stdout.trim() || "{}") as DockerLabelMap | null) ?? {}

        return {
            containerId,
            composeFiles: getComposeConfigFilesByLabelMap(labels),
            projectName: labels[DockerComposeProjectLabel],
        } as CurrentDockerComposeProject
    } catch {
        return undefined
    }
}

/** 校验不能操作当前管理系统所在 compose 项目 */
export async function ensureNotCurrentDockerComposeProject(composeFiles: string[]) {
    const currentProject = await getCurrentDockerComposeProject()
    if (!currentProject?.composeFiles.length) return

    const currentComposeFiles = currentProject.composeFiles.map(mapDockerHostPath).map(normalizeComparablePath)
    const nextComposeFiles = normalizeComposeFiles(composeFiles).map(mapDockerHostPath).map(normalizeComparablePath)
    const isSameProject = nextComposeFiles.some(file => currentComposeFiles.includes(file))

    if (!isSameProject) return

    throw new ClientError("不能操作当前管理系统所在的项目，请改为在宿主机上处理")
}
