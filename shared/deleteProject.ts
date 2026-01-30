import { DeleteProjectParams } from "@/schemas/deleteProject"

import { ensureProjectRoot } from "@/server/ensureProjectRoot"
import { getProjectDir } from "@/server/getProjectPaths"
import { isAdmin } from "@/server/isAdmin"

import { deleteFileOrFolder } from "@/server/deleteFileOrFolder"

export async function deleteProject({ name }: DeleteProjectParams) {
    await ensureProjectRoot()
    const projectDir = getProjectDir(name)

    await deleteFileOrFolder(projectDir)

    return {
        name,
    }
}

deleteProject.filter = isAdmin
