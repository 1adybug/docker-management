import { mkdir } from "node:fs/promises"

import { prisma } from "@/prisma"

import { UpdateProjectParams } from "@/schemas/updateProject"

import { ensureProjectRoot } from "@/server/ensureProjectRoot"
import { getProjectComposePath, getProjectDir } from "@/server/getProjectPaths"
import { isAdmin } from "@/server/isAdmin"
import { writeTextToFile } from "@/server/writeTextToFile"

import { ClientError } from "@/utils/clientError"

export async function updateProject({ name, content }: UpdateProjectParams) {
    await ensureProjectRoot()
    const projectDir = getProjectDir(name)
    const composePath = getProjectComposePath(name)

    const project = await prisma.project.findUnique({ where: { name } })
    if (!project) throw new ClientError("项目不存在")

    await prisma.project.update({
        where: { name },
        data: { content },
    })

    await mkdir(projectDir, { recursive: true })

    await writeTextToFile(composePath, content)

    return {
        name,
    }
}

updateProject.filter = isAdmin
