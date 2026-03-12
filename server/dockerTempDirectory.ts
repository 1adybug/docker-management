import { rmSync } from "node:fs"
import { mkdtemp, readdir } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

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

export const dockerTempDirectoryPrefixes = ["docker-management-image-", "docker-management-static-image-", "docker-management-jar-image-"]

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

export async function createDockerTempDirectory({ prefix }: CreateDockerTempDirectoryParams) {
    registerDockerTempDirectoryCleanup()

    const path = await mkdtemp(join(tmpdir(), prefix))
    getActiveDockerTempDirectories().add(path)

    return path
}

export async function deleteDockerTempDirectory(path: string) {
    getActiveDockerTempDirectories().delete(path)
    await deleteFileOrFolder(path)
}

export async function cleanupDockerTempDirectories({ prefixes = dockerTempDirectoryPrefixes }: CleanupDockerTempDirectoriesParams = {}) {
    const entries = await readdir(tmpdir(), { withFileTypes: true })

    await Promise.all(
        entries
            .filter(entry => entry.isDirectory() && prefixes.some(prefix => entry.name.startsWith(prefix)))
            .map(entry => deleteFileOrFolder(join(tmpdir(), entry.name))),
    )
}
