import { prisma } from "@/prisma"

import { DeleteProjectParams } from "@/schemas/deleteProject"

import { deleteFileOrFolder } from "@/server/deleteFileOrFolder"
import { ensureProjectRoot } from "@/server/ensureProjectRoot"
import { getProjectDir } from "@/server/getProjectPaths"
import { isAdmin } from "@/server/isAdmin"

import { ClientError } from "@/utils/clientError"

export async function deleteProject({ name }: DeleteProjectParams) {
    await ensureProjectRoot()
    const projectDir = getProjectDir(name)

    const project = await prisma.project.findUnique({ where: { name } })
    if (!project) throw new ClientError("项目不存在")

    await prisma.project.delete({ where: { name } })

    await deleteFileOrFolder(projectDir)

    return {
        name,
    }
}

deleteProject.filter = isAdmin
