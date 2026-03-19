import { isAbsolute, resolve, sep } from "node:path"

import { ClientError } from "@/utils/clientError"

function isWindowsAbsolutePath(path: string) {
    return /^[a-zA-Z]:[\\/]/u.test(path)
}

function ensureAbsoluteDirectory(path: string, label: string) {
    const cleanPath = path.trim()

    if (!cleanPath) throw new ClientError(`${label} 无效`)
    if (!isAbsolute(cleanPath) && !isWindowsAbsolutePath(cleanPath)) throw new ClientError(`${label} 必须为绝对路径`)

    return resolve(cleanPath)
}

function resolveProjectDirectory(root: string, name: string) {
    const dir = resolve(root, name)
    const rootLower = `${root.toLowerCase()}${sep}`
    const dirLower = `${dir.toLowerCase()}${sep}`

    if (!dirLower.startsWith(rootLower)) throw new ClientError("项目名称无效")

    return dir
}

/** 项目根目录 */
export function getProjectRoot() {
    const root = process.env.PROJECTS_ROOT?.trim()
    if (!root) return resolve(process.cwd(), "projects")

    return ensureAbsoluteDirectory(root, "PROJECTS_ROOT")
}

/** 宿主机项目根目录 */
export function getProjectHostRoot() {
    const root = process.env.PROJECTS_HOST_ROOT?.trim()
    if (!root) return getProjectRoot()

    return ensureAbsoluteDirectory(root, "PROJECTS_HOST_ROOT")
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
    return resolve(getProjectDir(name), "docker-compose.yml")
}
