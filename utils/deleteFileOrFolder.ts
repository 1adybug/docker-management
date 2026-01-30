import { rm } from "node:fs/promises"

export async function deleteFileOrFolder(path: string) {
    await rm(path, { force: true, recursive: true })
}
