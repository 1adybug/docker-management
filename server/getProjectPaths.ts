import { isAbsolute, relative, resolve, win32 } from "node:path"

import { SystemSettingKey } from "@/constants/systemSettings"

import { getCachedSystemSettingValue } from "@/server/systemSettings"

import { ClientError } from "@/utils/clientError"

function isWindowsAbsolutePath(path: string) {
    return /^[a-zA-Z]:[\\/]/u.test(path) || /^\\\\[^\\]+\\[^\\]+/u.test(path)
}

function getDockerDesktopHostPath(path: string) {
    if (process.platform === "win32" || !isWindowsAbsolutePath(path)) return undefined

    const normalizedPath = win32.normalize(path)
    const driveMatch = normalizedPath.match(/^([a-zA-Z]):(?:\\(.*))?$/u)

    if (!driveMatch?.[1]) return undefined

    const drive = driveMatch[1].toLowerCase()
    const segments = driveMatch[2]?.split(/\\+/u).filter(Boolean) ?? []
    const suffix = segments.join("/")

    return suffix ? `/run/desktop/mnt/host/${drive}/${suffix}` : `/run/desktop/mnt/host/${drive}`
}

function normalizeAbsoluteDirectory(path: string) {
    if (isWindowsAbsolutePath(path)) return win32.normalize(path)
    return resolve(path)
}

function normalizeDockerHostDirectory(path: string) {
    const dockerDesktopPath = getDockerDesktopHostPath(path)
    if (dockerDesktopPath) return dockerDesktopPath

    return normalizeAbsoluteDirectory(path)
}

function resolveDirectoryPath(root: string, path: string) {
    if (isWindowsAbsolutePath(root)) return win32.resolve(root, path)
    return resolve(root, path)
}

function isSubDirectory(root: string, path: string) {
    const relativePath = isWindowsAbsolutePath(root) ? win32.relative(root, path) : relative(root, path)

    if (!relativePath) return true
    if (relativePath === "..") return false
    if (relativePath.startsWith("../") || relativePath.startsWith("..\\")) return false
    if (isAbsolute(relativePath) || isWindowsAbsolutePath(relativePath)) return false

    return true
}

function ensureAbsoluteDirectory(path: string, label: string) {
    const cleanPath = path.trim()

    if (!cleanPath) throw new ClientError(`${label} 无效`)
    if (!isAbsolute(cleanPath) && !isWindowsAbsolutePath(cleanPath)) throw new ClientError(`${label} 必须为绝对路径`)

    return normalizeAbsoluteDirectory(cleanPath)
}

function resolveProjectDirectory(root: string, name: string) {
    const normalizedRoot = normalizeAbsoluteDirectory(root)
    const dir = resolveDirectoryPath(normalizedRoot, name)

    if (!isSubDirectory(normalizedRoot, dir)) throw new ClientError("项目名称无效")

    return dir
}

/** 项目根目录 */
export function getProjectRoot() {
    const root = getCachedSystemSettingValue(SystemSettingKey.项目根目录)?.trim()
    if (!root) return resolve(process.cwd(), "projects")

    return ensureAbsoluteDirectory(root, "PROJECTS_ROOT")
}

/** 宿主机项目根目录 */
export function getProjectHostRoot() {
    const root = getCachedSystemSettingValue(SystemSettingKey.宿主机项目根目录)?.trim()
    if (!root) return getProjectRoot()

    return normalizeDockerHostDirectory(ensureAbsoluteDirectory(root, "PROJECTS_HOST_ROOT"))
}

/** 项目目录 */
export function getProjectDir(name: string) {
    return resolveProjectDirectory(getProjectRoot(), name)
}

/** 宿主机项目目录 */
export function getProjectHostDir(name: string) {
    return resolveProjectDirectory(getProjectHostRoot(), name)
}

/** docker-compose.yml 路径 */
export function getProjectComposePath(name: string) {
    return resolveDirectoryPath(getProjectDir(name), "docker-compose.yml")
}
