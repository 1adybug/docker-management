import { constants } from "node:fs"
import { access, chmod, chown, lstat, mkdir, open, stat } from "node:fs/promises"
import { basename, dirname, extname, isAbsolute, resolve } from "node:path"

import { CheckProjectStartResult, EnsureComposeMountPathsParams, ProjectStartMountItem, ProjectStartMountStatus } from "@/schemas/checkProjectStart"
import { ProjectStartMountOption } from "@/schemas/projectStartMountOption"
import { ProjectStartMountPathKind } from "@/schemas/projectStartMountPathKind"

import { ClientError } from "@/utils/clientError"
import { parseComposeYaml } from "@/utils/compose"

/** 路径异常 */
export interface PathError extends Error {
    code?: string
}

/** compose 短语法挂载项 */
export interface ComposeShortSyntaxVolumePaths {
    sourcePath?: string
    targetPath?: string
}

/** compose 长语法挂载项 */
export interface ComposeVolumeItem {
    type?: unknown
    source?: unknown
    target?: unknown
}

/** 数字型容器用户 */
export interface ComposeNumericUser {
    uid: number
    gid?: number
}

/** 带原始挂载数据的服务配置 */
export interface ComposeServiceWithVolumes {
    volumes?: unknown[]
    user?: unknown
}

/** 通用对象 */
export interface UnknownRecord {
    [key: string]: unknown
}

/** compose 挂载路径候选项 */
export interface ComposeMountPathCandidate {
    key: string
    serviceName: string
    sourcePath: string
    targetPath: string
    resolvedPath: string
    isAbsolutePath: boolean
    isRelativePath: boolean
    defaultPathKind: ProjectStartMountPathKind
    numericUser?: ComposeNumericUser
}

/** 已存在的路径信息 */
export interface ExistingPathInfo {
    path: string
    stat: Awaited<ReturnType<typeof stat>>
}

/** 构建挂载检查项参数 */
export interface BuildProjectStartMountItemParams {
    candidate: ComposeMountPathCandidate
    exists: boolean
    canConfigure: boolean
    pathKind: ProjectStartMountPathKind
    status: ProjectStartMountStatus
    createDirectory?: boolean
    message?: string
}

/** 检查缺失目录参数 */
export interface CheckMissingDirectoryParams {
    candidate: ComposeMountPathCandidate
    canConfigure: boolean
    createDirectory: boolean
}

/** 检查缺失文件参数 */
export interface CheckMissingFileParams {
    candidate: ComposeMountPathCandidate
    canConfigure: boolean
}

/** 挂载路径权限修复项 */
export interface ComposeMountPathPermissionRepairItem {
    item: ProjectStartMountItem
    candidate: ComposeMountPathCandidate
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

function isRelativePath(path: string) {
    return path.startsWith("./") || path.startsWith("../")
}

function isAbsolutePathLike(path: string) {
    return path.startsWith("/") || isWindowsAbsolutePath(path)
}

function isPathLikeVolumeSource(path: string) {
    return isRelativePath(path) || isAbsolutePathLike(path)
}

function isProbablyFilePath(path: string) {
    const cleanPath = path.trim().replace(/[\\/]+$/u, "")
    const name = basename(cleanPath)

    if (!name || name === "." || name === "..") return false

    return extname(name) !== ""
}

function normalizeComparablePath(path: string) {
    return path.trim().replace(/\\/g, "/").replace(/\/+/g, "/").replace(/\/$/u, "").toLowerCase()
}

function getMountPathKey(serviceName: string, sourcePath: string, targetPath: string) {
    return JSON.stringify([serviceName, sourcePath, targetPath])
}

function isValidNumericUserPart(value: string) {
    return /^\d+$/u.test(value)
}

function parseComposeNumericUser(user: unknown) {
    const rawUser = typeof user === "number" ? `${user}` : typeof user === "string" ? user.trim() : ""
    if (!rawUser) return undefined

    const parts = rawUser.split(":")
    if (parts.length > 2) return undefined

    const uidText = parts[0]?.trim() ?? ""
    const gidText = parts[1]?.trim() ?? ""

    if (!isValidNumericUserPart(uidText)) return undefined
    if (gidText && !isValidNumericUserPart(gidText)) return undefined

    return {
        uid: Number(uidText),
        gid: gidText ? Number(gidText) : undefined,
    } as ComposeNumericUser
}

function getShortSyntaxVolumePaths(value: string) {
    const cleanValue = value.trim()
    if (!cleanValue) return undefined

    const windowsPathMatch = cleanValue.match(/^([a-zA-Z]:[\\/][^:]*):([^:]+)(?::.+)?$/u)

    if (windowsPathMatch?.[1] && windowsPathMatch?.[2]) {
        return {
            sourcePath: windowsPathMatch[1].trim(),
            targetPath: windowsPathMatch[2].trim(),
        } as ComposeShortSyntaxVolumePaths
    }

    const segments = cleanValue.split(":")
    if (segments.length < 2) return undefined

    const sourcePath = segments[0]?.trim()
    const targetPath = segments[1]?.trim()

    if (!sourcePath || !targetPath) return undefined

    return {
        sourcePath,
        targetPath,
    } as ComposeShortSyntaxVolumePaths
}

function getVolumePaths(item: unknown) {
    if (typeof item === "string") {
        const paths = getShortSyntaxVolumePaths(item)
        if (!paths?.sourcePath || !paths.targetPath || !isPathLikeVolumeSource(paths.sourcePath)) return undefined
        return paths
    }

    if (!isObject(item)) return undefined

    const volume = item as ComposeVolumeItem
    const type = typeof volume.type === "string" ? volume.type.trim().toLowerCase() : undefined

    if (type && type !== "bind") return undefined

    const sourcePath = typeof volume.source === "string" ? volume.source.trim() : ""
    const targetPath = typeof volume.target === "string" ? volume.target.trim() : ""

    if (!sourcePath || !targetPath || !isPathLikeVolumeSource(sourcePath)) return undefined

    return {
        sourcePath,
        targetPath,
    } as ComposeShortSyntaxVolumePaths
}

function resolveMountPath(projectDir: string, sourcePath: string) {
    if (isAbsolute(sourcePath) || isWindowsAbsolutePath(sourcePath)) return sourcePath
    return resolve(projectDir, sourcePath)
}

function getProjectStartMountOptionMap(mountPathOptions?: ProjectStartMountOption[]) {
    return new Map((mountPathOptions ?? []).map(item => [item.key, item]))
}

function buildProjectStartMountItem({ candidate, exists, canConfigure, pathKind, status, createDirectory, message }: BuildProjectStartMountItemParams) {
    return {
        key: candidate.key,
        serviceName: candidate.serviceName,
        sourcePath: candidate.sourcePath,
        targetPath: candidate.targetPath,
        resolvedPath: candidate.resolvedPath,
        isAbsolutePath: candidate.isAbsolutePath,
        exists,
        canConfigure,
        pathKind,
        createDirectory,
        status,
        message,
    } as ProjectStartMountItem
}

function buildPermissionConflictMessage(first: ComposeMountPathCandidate, second: ComposeMountPathCandidate) {
    return `挂载路径权限修复冲突：${first.serviceName} 的 ${first.sourcePath} 与 ${second.serviceName} 的 ${second.sourcePath} 需要不同的容器用户，请统一 compose 中的 user 配置`
}

function isSameNumericUser(first: ComposeNumericUser, second: ComposeNumericUser) {
    return first.uid === second.uid && first.gid === second.gid
}

function isComparablePathInside(parentPath: string, childPath: string) {
    return childPath === parentPath || childPath.startsWith(`${parentPath}/`)
}

function isOverlappingComparablePath(firstPath: string, secondPath: string) {
    return isComparablePathInside(firstPath, secondPath) || isComparablePathInside(secondPath, firstPath)
}

function getMountPathPermissionConflictMap(candidates: ComposeMountPathCandidate[]) {
    const conflictMap = new Map<string, string>()
    const relativeCandidates = candidates.filter(candidate => candidate.isRelativePath && candidate.numericUser)

    relativeCandidates.forEach((candidate, index) => {
        const candidateComparablePath = normalizeComparablePath(candidate.resolvedPath)

        relativeCandidates.slice(index + 1).forEach(otherCandidate => {
            if (!candidate.numericUser || !otherCandidate.numericUser) return
            if (isSameNumericUser(candidate.numericUser, otherCandidate.numericUser)) return

            const otherComparablePath = normalizeComparablePath(otherCandidate.resolvedPath)
            if (!isOverlappingComparablePath(candidateComparablePath, otherComparablePath)) return

            conflictMap.set(candidate.key, buildPermissionConflictMessage(candidate, otherCandidate))
            conflictMap.set(otherCandidate.key, buildPermissionConflictMessage(otherCandidate, candidate))
        })
    })

    return conflictMap
}

function getPermissionMessage(path: string, isAbsolutePath: boolean) {
    if (isAbsolutePath)
        return `无法创建挂载路径：${path}，请确认当前应用对该绝对路径有写权限；如果应用运行在容器中，请先将对应宿主机目录以可写方式挂载进当前容器`

    return `无法创建挂载路径：${path}，请确认当前应用对该路径有写权限`
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

async function getPathCreateBlockedMessage(path: string, isAbsolutePath: boolean) {
    const parentInfo = await findNearestExistingPath(dirname(path))

    if (!parentInfo) return "找不到可用的父级目录"

    if (!parentInfo.stat.isDirectory()) return `父级路径无效：${parentInfo.path}`

    try {
        await access(parentInfo.path, constants.W_OK)
    } catch (error) {
        if (isPermissionError(error)) return getPermissionMessage(path, isAbsolutePath)
        throw error
    }

    return undefined
}

function getExistingPathKind(pathStat: Awaited<ReturnType<typeof stat>>) {
    if (pathStat.isFile()) return ProjectStartMountPathKind.文件
    if (pathStat.isDirectory()) return ProjectStartMountPathKind.文件夹
    return undefined
}

function getComposeMountPathCandidates({ projectDir, content }: EnsureComposeMountPathsParams) {
    try {
        const compose = parseComposeYaml(content)
        const services = Object.entries(compose.services ?? {}) as [string, ComposeServiceWithVolumes][]
        const candidateMap = new Map<string, ComposeMountPathCandidate>()

        services.forEach(([serviceName, service]) => {
            const numericUser = parseComposeNumericUser(service.user)

            ;(service.volumes ?? []).forEach(item => {
                const volumePaths = getVolumePaths(item)
                if (!volumePaths?.sourcePath || !volumePaths.targetPath) return

                const sourcePath = volumePaths.sourcePath
                const isRelativePathValue = isRelativePath(sourcePath)
                if (!isRelativePathValue && isProbablyFilePath(sourcePath)) return

                const key = getMountPathKey(serviceName, sourcePath, volumePaths.targetPath)
                if (candidateMap.has(key)) return

                candidateMap.set(key, {
                    key,
                    serviceName,
                    sourcePath,
                    targetPath: volumePaths.targetPath,
                    resolvedPath: resolveMountPath(projectDir, sourcePath),
                    isAbsolutePath: isAbsolutePathLike(sourcePath),
                    isRelativePath: isRelativePathValue,
                    defaultPathKind: isProbablyFilePath(sourcePath) ? ProjectStartMountPathKind.文件 : ProjectStartMountPathKind.文件夹,
                    numericUser,
                })
            })
        })

        return Array.from(candidateMap.values())
    } catch {
        return []
    }
}

async function checkMissingFile({ candidate, canConfigure }: CheckMissingFileParams) {
    const blockedMessage = await getPathCreateBlockedMessage(candidate.resolvedPath, candidate.isAbsolutePath)

    if (blockedMessage) {
        return buildProjectStartMountItem({
            candidate,
            exists: false,
            canConfigure,
            pathKind: ProjectStartMountPathKind.文件,
            status: ProjectStartMountStatus.不可创建,
            message: blockedMessage,
        })
    }

    return buildProjectStartMountItem({
        candidate,
        exists: false,
        canConfigure,
        pathKind: ProjectStartMountPathKind.文件,
        status: ProjectStartMountStatus.将创建,
        message: "启动时会自动创建空文件",
    })
}

async function checkMissingDirectory({ candidate, canConfigure, createDirectory }: CheckMissingDirectoryParams) {
    if (!createDirectory) {
        return buildProjectStartMountItem({
            candidate,
            exists: false,
            canConfigure,
            pathKind: ProjectStartMountPathKind.文件夹,
            createDirectory,
            status: ProjectStartMountStatus.不可创建,
            message: "路径不存在，且未允许自动创建目录",
        })
    }

    const blockedMessage = await getPathCreateBlockedMessage(candidate.resolvedPath, candidate.isAbsolutePath)

    if (blockedMessage) {
        return buildProjectStartMountItem({
            candidate,
            exists: false,
            canConfigure,
            pathKind: ProjectStartMountPathKind.文件夹,
            createDirectory,
            status: ProjectStartMountStatus.不可创建,
            message: blockedMessage,
        })
    }

    return buildProjectStartMountItem({
        candidate,
        exists: false,
        canConfigure,
        pathKind: ProjectStartMountPathKind.文件夹,
        createDirectory,
        status: ProjectStartMountStatus.将创建,
        message: "启动时会自动创建目录",
    })
}

async function checkMountPath(candidate: ComposeMountPathCandidate, optionMap: Map<string, ProjectStartMountOption>, permissionConflictMessage?: string) {
    const pathStat = await getPathStat(candidate.resolvedPath)
    const option = optionMap.get(candidate.key)
    const missingPathKind = option?.pathKind ?? candidate.defaultPathKind

    if (pathStat) {
        const existingPathKind = getExistingPathKind(pathStat)

        if (existingPathKind) {
            const item = buildProjectStartMountItem({
                candidate,
                exists: true,
                canConfigure: false,
                pathKind: existingPathKind,
                createDirectory: existingPathKind === ProjectStartMountPathKind.文件夹 ? true : undefined,
                status: ProjectStartMountStatus.已存在,
                message: existingPathKind === ProjectStartMountPathKind.文件 ? "文件已存在" : "目录已存在",
            })

            if (!permissionConflictMessage) return item

            return {
                ...item,
                status: ProjectStartMountStatus.不可创建,
                message: permissionConflictMessage,
            } as ProjectStartMountItem
        }

        const item = buildProjectStartMountItem({
            candidate,
            exists: true,
            canConfigure: false,
            pathKind: candidate.defaultPathKind,
            createDirectory: candidate.defaultPathKind === ProjectStartMountPathKind.文件夹 ? true : undefined,
            status: ProjectStartMountStatus.不可创建,
            message: "目标路径已存在，但既不是文件也不是目录",
        })

        if (!permissionConflictMessage) return item

        return {
            ...item,
            message: permissionConflictMessage,
        } as ProjectStartMountItem
    }

    if (!candidate.isRelativePath) {
        const item = await checkMissingDirectory({
            candidate,
            canConfigure: false,
            createDirectory: true,
        })

        if (!permissionConflictMessage) return item

        return {
            ...item,
            status: ProjectStartMountStatus.不可创建,
            message: permissionConflictMessage,
        } as ProjectStartMountItem
    }

    if (missingPathKind === ProjectStartMountPathKind.文件) {
        const item = await checkMissingFile({
            candidate,
            canConfigure: true,
        })

        if (!permissionConflictMessage) return item

        return {
            ...item,
            status: ProjectStartMountStatus.不可创建,
            message: permissionConflictMessage,
        } as ProjectStartMountItem
    }

    const item = await checkMissingDirectory({
        candidate,
        canConfigure: true,
        createDirectory: option?.createDirectory ?? true,
    })

    if (!permissionConflictMessage) return item

    return {
        ...item,
        status: ProjectStartMountStatus.不可创建,
        message: permissionConflictMessage,
    } as ProjectStartMountItem
}

async function createDirectoryForMountItem(item: ProjectStartMountItem) {
    try {
        await mkdir(item.resolvedPath, { recursive: true })
    } catch (error) {
        if (isPermissionError(error)) throw new ClientError(getPermissionMessage(item.resolvedPath, item.isAbsolutePath))
        throw error
    }
}

async function createFileForMountItem(item: ProjectStartMountItem) {
    try {
        await mkdir(dirname(item.resolvedPath), { recursive: true })
    } catch (error) {
        if (isPermissionError(error)) throw new ClientError(getPermissionMessage(item.resolvedPath, item.isAbsolutePath))
        throw error
    }

    const pathStat = await getPathStat(item.resolvedPath)
    if (pathStat?.isFile()) return
    if (pathStat) throw new ClientError("目标路径已存在，但不是文件")

    const file = await open(item.resolvedPath, "w")
    await file.close()
}

async function createMountPath(item: ProjectStartMountItem) {
    if (item.pathKind === ProjectStartMountPathKind.文件) {
        await createFileForMountItem(item)
        return
    }

    await createDirectoryForMountItem(item)
}

function getPermissionRepairItems(items: ProjectStartMountItem[], candidates: ComposeMountPathCandidate[]) {
    const candidateMap = new Map(candidates.map(candidate => [candidate.key, candidate]))

    return items
        .map(item => {
            const candidate = candidateMap.get(item.key)
            if (!candidate?.isRelativePath) return undefined

            return {
                item,
                candidate,
            } as ComposeMountPathPermissionRepairItem
        })
        .filter((item): item is ComposeMountPathPermissionRepairItem => !!item)
}

function getNextPermissionMode(pathStat: Awaited<ReturnType<typeof stat>>) {
    const currentMode = Number(pathStat.mode)
    const addExecute = pathStat.isDirectory() || (currentMode & 0o111) > 0
    return currentMode | 0o666 | (addExecute ? 0o111 : 0)
}

async function applyMountPathPermission(path: string, onVisit: (path: string, pathStat: Awaited<ReturnType<typeof stat>>) => Promise<void>) {
    const pathLStat = await lstat(path)

    // 避免修复符号链接指向的宿主机其他位置
    if (pathLStat.isSymbolicLink()) return

    const pathStat = await stat(path)
    await onVisit(path, pathStat)
}

async function applyMountPathMode(path: string, pathStat: Awaited<ReturnType<typeof stat>>) {
    const nextMode = getNextPermissionMode(pathStat)
    if ((Number(pathStat.mode) & 0o777) === (nextMode & 0o777)) return
    await chmod(path, nextMode)
}

async function applyMountPathOwner(path: string, pathStat: Awaited<ReturnType<typeof stat>>, numericUser: ComposeNumericUser) {
    const currentUid = Number(pathStat.uid)
    const currentGid = Number(pathStat.gid)
    const nextGid = numericUser.gid ?? currentGid

    if (currentUid === numericUser.uid && currentGid === nextGid) return
    await chown(path, numericUser.uid, nextGid)
}

async function ensureMountPathPermission(item: ComposeMountPathPermissionRepairItem) {
    try {
        await applyMountPathPermission(item.item.resolvedPath, async function onVisit(path, pathStat) {
            if (item.candidate.numericUser) await applyMountPathOwner(path, pathStat, item.candidate.numericUser)
            await applyMountPathMode(path, pathStat)
        })
    } catch (error) {
        if (isPermissionError(error))
            throw new ClientError(`无法修复挂载路径权限：${item.item.resolvedPath}，请确认当前应用对该路径有权限，或调整宿主机文件权限后重试`)

        throw error
    }
}

/** 检查 compose 挂载路径状态 */
export async function checkComposeMountPaths(params: EnsureComposeMountPathsParams) {
    const candidates = getComposeMountPathCandidates(params)
    const optionMap = getProjectStartMountOptionMap(params.mountPathOptions)
    const permissionConflictMap = getMountPathPermissionConflictMap(candidates)
    const items = await Promise.all(candidates.map(candidate => checkMountPath(candidate, optionMap, permissionConflictMap.get(candidate.key))))
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

/** 启动前确保 compose 中可自动补齐的挂载路径存在 */
export async function ensureComposeMountPaths(params: EnsureComposeMountPathsParams) {
    const result = await checkComposeMountPaths(params)
    const blockedItem = result.items.find(item => item.status === ProjectStartMountStatus.不可创建)

    if (blockedItem) throw new ClientError(blockedItem.message || `挂载路径不可用：${blockedItem.resolvedPath}`)

    for (const item of result.items) {
        if (item.status !== ProjectStartMountStatus.将创建) continue
        await createMountPath(item)
    }

    const candidates = getComposeMountPathCandidates(params)
    const permissionRepairItems = getPermissionRepairItems(result.items, candidates)

    for (const item of permissionRepairItems) await ensureMountPathPermission(item)
}
