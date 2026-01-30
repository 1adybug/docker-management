import { resolve, sep } from "node:path"

import { ClientError } from "@/utils/clientError"

/** 项目根目录 */
export function getProjectRoot() {
    return resolve(process.cwd(), "data", "projects")
}

/** 项目目录 */
export function getProjectDir(name: string) {
    const root = getProjectRoot()
    const dir = resolve(root, name)
    const rootLower = `${root.toLowerCase()}${sep}`
    const dirLower = `${dir.toLowerCase()}${sep}`

    if (!dirLower.startsWith(rootLower)) {
        throw new ClientError("项目名称无效")
    }

    return dir
}

/** docker-compose.yml 路径 */
export function getProjectComposePath(name: string) {
    return resolve(getProjectDir(name), "docker-compose.yml")
}
