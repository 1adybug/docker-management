import { constants } from "node:fs"
import { access, mkdir, stat } from "node:fs/promises"
import { basename, dirname, extname, isAbsolute, resolve } from "node:path"

import { CheckProjectStartResult, EnsureComposeMountDirectoriesParams, ProjectStartMountItem, ProjectStartMountStatus } from "@/schemas/checkProjectStart"

import { ClientError } from "@/utils/clientError"
import { parseComposeYaml } from "@/utils/compose"

/** 路径异常 */
export interface PathError extends Error {
    code?: string
}

/** compose 长语法挂载项 */
export interface ComposeVolumeItem {
    type?: unknown
    source?: unknown
    target?: unknown
}

/** 带原始挂载数据的服务配置 */
export interface ComposeServiceWithVolumes {
    volumes?: unknown[]
}

/** 通用对象 */
export interface UnknownRecord {
    [key: string]: unknown
}

/** compose 挂载目录候选项 */
export interface ComposeMountDirectoryCandidate {
    sourcePath: string
    resolvedPath: string
    isAbsolutePath: boolean
}

/** 已存在的路径信息 */
export interface ExistingPathInfo {
    path: string
    stat: Awaited<ReturnType<typeof stat>>
}

function isNoEntryError(error: unknown) {
    const pathError = error as PathError
    return pathError?.code === "ENOENT"
}

function isPermissionError(error: unknown) {
    const pathError = error as PathError
    return pathError?.code === "EACCES" || pathError?.code === "EPERM"
}

async function getPathStat(path: string) {
    try {
        return await stat(path)
    } catch (error) {
        if (isNoEntryError(error)) return undefined
        throw error
    }
}

function isObject(value: unknown): value is UnknownRecord {
    return typeof value === "object" && value !== null
}

function isWindowsAbsolutePath(path: string) {
    return /^[a-zA-Z]:[\\/]/u.test(path)
}

function isPathLikeVolumeSource(path: string) {
    return path.startsWith("./") || path.startsWith("../") || path.startsWith("/") || isWindowsAbsolutePath(path)
}

function isProbablyFilePath(path: string) {
    const cleanPath = path.trim().replace(/[\\/]+$/u, "")
    const name = basename(cleanPath)

    if (!name || name === "." || name === "..") return false

    return extname(name) !== ""
}

function getShortSyntaxSource(value: string) {
    const cleanValue = value.trim()
    if (!cleanValue) return undefined

    const windowsPathMatch = cleanValue.match(/^([a-zA-Z]:[\\/][^:]*):.+$/u)
    if (windowsPathMatch?.[1]) return windowsPathMatch[1]

    const separatorIndex = cleanValue.indexOf(":")
    if (separatorIndex < 0) return undefined

    return cleanValue.slice(0, separatorIndex).trim() || undefined
}

function getVolumeSource(item: unknown) {
    if (typeof item === "string") {
        const source = getShortSyntaxSource(item)
        if (!source || !isPathLikeVolumeSource(source)) return undefined
        return source
    }

    if (!isObject(item)) return undefined

    const volume = item as ComposeVolumeItem
    const type = typeof volume.type === "string" ? volume.type.trim().toLowerCase() : undefined

    if (type && type !== "bind") return undefined

    const source = typeof volume.source === "string" ? volume.source.trim() : ""
    const target = typeof volume.target === "string" ? volume.target.trim() : ""

    if (!source || !target || !isPathLikeVolumeSource(source)) return undefined

    return source
}

function resolveMountDirectoryPath(projectDir: string, source: string) {
    if (isAbsolute(source) || isWindowsAbsolutePath(source)) return source
    return resolve(projectDir, source)
}

function getComposeMountDirectoryCandidates({ projectDir, content }: EnsureComposeMountDirectoriesParams) {
    try {
        const compose = parseComposeYaml(content)
        const services = Object.values(compose.services ?? {}) as ComposeServiceWithVolumes[]
        const directoryMap = new Map<string, ComposeMountDirectoryCandidate>()

        services.forEach(service => {
            ;

            ;(service.volumes ?? []).forEach(item => {
                const sourcePath = getVolumeSource(item)
                if (!sourcePath || isProbablyFilePath(sourcePath)) return

                const resolvedPath = resolveMountDirectoryPath(projectDir, sourcePath)

                if (directoryMap.has(resolvedPath)) return

                directoryMap.set(resolvedPath, {
                    sourcePath,
                    resolvedPath,
                    isAbsolutePath: isAbsolute(sourcePath) || isWindowsAbsolutePath(sourcePath),
                })
            })
        })

        return Array.from(directoryMap.values())
    } catch {
        return []
    }
}

function getPermissionMessage(path: string, isAbsolutePath: boolean) {
    if (isAbsolutePath)
        return `无法创建挂载目录：${path}，请确认当前应用对该绝对路径有写权限；如果应用运行在容器中，请先将对应宿主机目录以可写方式挂载进当前容器`

    return `无法创建挂载目录：${path}，请确认当前应用对该目录有写权限`
}

async function findNearestExistingPath(path: string): Promise<ExistingPathInfo | undefined> {
    let currentPath = path

    while (true) {
        const currentStat = await getPathStat(currentPath)

        if (currentStat) {
            return {
                path: currentPath,
                stat: currentStat,
            }
        }

        const parentPath = dirname(currentPath)
        if (parentPath === currentPath) return undefined
        currentPath = parentPath
    }
}

async function checkMountDirectory(candidate: ComposeMountDirectoryCandidate) {
    const directoryStat = await getPathStat(candidate.resolvedPath)

    if (directoryStat) {
        if (directoryStat.isDirectory()) {
            return {
                sourcePath: candidate.sourcePath,
                resolvedPath: candidate.resolvedPath,
                isAbsolutePath: candidate.isAbsolutePath,
                status: ProjectStartMountStatus.已存在,
                message: "目录已存在",
            } as ProjectStartMountItem
        }

        return {
            sourcePath: candidate.sourcePath,
            resolvedPath: candidate.resolvedPath,
            isAbsolutePath: candidate.isAbsolutePath,
            status: ProjectStartMountStatus.不可创建,
            message: "目标路径已存在，但不是目录",
        } as ProjectStartMountItem
    }

    const parentInfo = await findNearestExistingPath(dirname(candidate.resolvedPath))

    if (!parentInfo) {
        return {
            sourcePath: candidate.sourcePath,
            resolvedPath: candidate.resolvedPath,
            isAbsolutePath: candidate.isAbsolutePath,
            status: ProjectStartMountStatus.不可创建,
            message: "找不到可用的父级目录",
        } as ProjectStartMountItem
    }

    if (!parentInfo.stat.isDirectory()) {
        return {
            sourcePath: candidate.sourcePath,
            resolvedPath: candidate.resolvedPath,
            isAbsolutePath: candidate.isAbsolutePath,
            status: ProjectStartMountStatus.不可创建,
            message: `父级路径无效：${parentInfo.path}`,
        } as ProjectStartMountItem
    }

    try {
        await access(parentInfo.path, constants.W_OK)
    } catch (error) {
        if (isPermissionError(error)) {
            return {
                sourcePath: candidate.sourcePath,
                resolvedPath: candidate.resolvedPath,
                isAbsolutePath: candidate.isAbsolutePath,
                status: ProjectStartMountStatus.不可创建,
                message: getPermissionMessage(candidate.resolvedPath, candidate.isAbsolutePath),
            } as ProjectStartMountItem
        }

        throw error
    }

    return {
        sourcePath: candidate.sourcePath,
        resolvedPath: candidate.resolvedPath,
        isAbsolutePath: candidate.isAbsolutePath,
        status: ProjectStartMountStatus.将创建,
        message: "目录不存在，启动时会自动创建",
    } as ProjectStartMountItem
}

/** 检查 compose 挂载目录状态 */
export async function checkComposeMountDirectories(params: EnsureComposeMountDirectoriesParams) {
    const candidates = getComposeMountDirectoryCandidates(params)
    const items = await Promise.all(candidates.map(checkMountDirectory))
    const blockedCount = items.filter(item => item.status === ProjectStartMountStatus.不可创建).length
    const createCount = items.filter(item => item.status === ProjectStartMountStatus.将创建).length
    const existsCount = items.filter(item => item.status === ProjectStartMountStatus.已存在).length

    return {
        items,
        canStart: blockedCount === 0,
        blockedCount,
        createCount,
        existsCount,
    } as CheckProjectStartResult
}

async function createDirectory(item: ProjectStartMountItem) {
    try {
        await mkdir(item.resolvedPath, { recursive: true })
    } catch (error) {
        if (isPermissionError(error)) throw new ClientError(getPermissionMessage(item.resolvedPath, item.isAbsolutePath))
        throw error
    }
}

/** 启动前确保 compose 中可自动补齐的挂载目录存在 */
export async function ensureComposeMountDirectories(params: EnsureComposeMountDirectoriesParams) {
    const result = await checkComposeMountDirectories(params)
    const blockedItem = result.items.find(item => item.status === ProjectStartMountStatus.不可创建)

    if (blockedItem) throw new ClientError(blockedItem.message || `挂载目录不可用：${blockedItem.resolvedPath}`)

    for (const item of result.items) {
        if (item.status !== ProjectStartMountStatus.将创建) continue
        await createDirectory(item)
    }
}
