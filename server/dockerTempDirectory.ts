import { constants, rmSync } from "node:fs"
import { access, mkdir, mkdtemp, readdir } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"

import { deleteFileOrFolder } from "./deleteFileOrFolder"

export interface DockerTempDirectoryGlobalState {
    __dockerManagementTempDirectoryCleanupRegistered__?: boolean
    __dockerManagementTempDirectories__?: Set<string>
}

export interface CreateDockerTempDirectoryParams {
    prefix: string
}

export interface CleanupDockerTempDirectoriesParams {
    prefixes?: string[]
}

export interface DockerTempDirectoryRootError {
    code?: string
}

export const dockerTempDirectoryPrefixes = ["docker-management-image-", "docker-management-static-image-", "docker-management-jar-image-"]
export const DefaultDockerTempDirectoryRoot = resolve(process.cwd(), "data", "tmp", "docker")

function getDockerTempDirectoryGlobalState() {
    return globalThis as typeof globalThis & DockerTempDirectoryGlobalState
}

function getActiveDockerTempDirectories() {
    const globalState = getDockerTempDirectoryGlobalState()
    globalState.__dockerManagementTempDirectories__ ??= new Set<string>()
    return globalState.__dockerManagementTempDirectories__
}

function cleanupActiveDockerTempDirectoriesSync() {
    const directories = getActiveDockerTempDirectories()

    for (const path of directories) {
        try {
            rmSync(path, { recursive: true, force: true })
        } catch {}
    }

    directories.clear()
}

function registerDockerTempDirectoryCleanup() {
    const globalState = getDockerTempDirectoryGlobalState()

    if (globalState.__dockerManagementTempDirectoryCleanupRegistered__) return

    process.once("exit", cleanupActiveDockerTempDirectoriesSync)

    globalState.__dockerManagementTempDirectoryCleanupRegistered__ = true
}

function getDockerTempDirectoryRootCandidates() {
    const roots = new Set<string>()
    const customRoot = process.env.DOCKER_TEMP_ROOT?.trim()

    if (customRoot) roots.add(resolve(customRoot))

    // 优先使用平台自身可控的数据目录，避免依赖容器内 /tmp 的权限配置
    roots.add(DefaultDockerTempDirectoryRoot)

    roots.add(tmpdir())

    return [...roots]
}

function isIgnorableDockerTempDirectoryError(error: unknown) {
    const code = (error as DockerTempDirectoryRootError | undefined)?.code
    return code === "ENOENT" || code === "EACCES" || code === "EPERM"
}

async function ensureDockerTempDirectoryRoot(path: string) {
    await mkdir(path, { recursive: true })
    await access(path, constants.R_OK | constants.W_OK)
}

export async function resolveDockerTempDirectoryRoot() {
    const roots = getDockerTempDirectoryRootCandidates()
    let lastError: unknown

    for (const root of roots) {
        try {
            await ensureDockerTempDirectoryRoot(root)
            return root
        } catch (error) {
            lastError = error
        }
    }

    throw lastError ?? new Error(`无法创建 Docker 临时目录，可选路径: ${roots.join(", ")}`)
}

export async function createDockerTempDirectory({ prefix }: CreateDockerTempDirectoryParams) {
    registerDockerTempDirectoryCleanup()

    const root = await resolveDockerTempDirectoryRoot()
    const path = await mkdtemp(join(root, prefix))
    getActiveDockerTempDirectories().add(path)

    return path
}

export async function deleteDockerTempDirectory(path: string) {
    getActiveDockerTempDirectories().delete(path)
    await deleteFileOrFolder(path)
}

export async function cleanupDockerTempDirectories({ prefixes = dockerTempDirectoryPrefixes }: CleanupDockerTempDirectoriesParams = {}) {
    const roots = getDockerTempDirectoryRootCandidates()

    await Promise.all(roots.map(root => cleanupDockerTempDirectoriesByRoot({ root, prefixes })))
}

export interface CleanupDockerTempDirectoriesByRootParams {
    root: string
    prefixes: string[]
}

async function cleanupDockerTempDirectoriesByRoot({ root, prefixes }: CleanupDockerTempDirectoriesByRootParams) {
    try {
        const entries = await readdir(root, { withFileTypes: true })

        await Promise.all(
            entries
                .filter(entry => entry.isDirectory() && prefixes.some(prefix => entry.name.startsWith(prefix)))
                .map(entry => deleteFileOrFolder(join(root, entry.name))),
        )
    } catch (error) {
        if (isIgnorableDockerTempDirectoryError(error)) return
        throw error
    }
}
