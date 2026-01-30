import { stat } from "node:fs/promises"

import { UpdateProjectParams } from "@/schemas/updateProject"

import { ensureProjectRoot } from "@/server/ensureProjectRoot"
import { getProjectComposePath } from "@/server/getProjectPaths"
import { isAdmin } from "@/server/isAdmin"
import { writeTextToFile } from "@/server/writeTextToFile"

import { ClientError } from "@/utils/clientError"

export async function updateProject({ name, content }: UpdateProjectParams) {
    await ensureProjectRoot()
    const composePath = getProjectComposePath(name)

    try {
        await stat(composePath)
    } catch {
        throw new ClientError("项目不存在")
    }

    await writeTextToFile(composePath, content)

    return {
        name,
    }
}

updateProject.filter = isAdmin
