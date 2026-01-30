import { mkdir } from "node:fs/promises"

import { getProjectRoot } from "./getProjectPaths"

/** 确保项目根目录存在 */
export async function ensureProjectRoot() {
    const root = getProjectRoot()
    await mkdir(root, { recursive: true })
    return root
}
