import { stat } from "node:fs/promises"

import { GetProjectParams } from "@/schemas/getProject"

import { ensureProjectRoot } from "@/server/ensureProjectRoot"
import { getProjectComposePath } from "@/server/getProjectPaths"
import { isAdmin } from "@/server/isAdmin"
import { readTextFromFile } from "@/server/readTextFromFile"

import { ClientError } from "@/utils/clientError"

export interface ProjectDetail {
    name: string
    content: string
    updatedAt: number
}

export async function getProject({ name }: GetProjectParams) {
    await ensureProjectRoot()
    const composePath = getProjectComposePath(name)

    try {
        const stats = await stat(composePath)
        const content = await readTextFromFile(composePath)

        return {
            name,
            content,
            updatedAt: stats.mtimeMs,
        } as ProjectDetail
    } catch {
        throw new ClientError("项目不存在")
    }
}

getProject.filter = isAdmin
