import { mkdir } from "node:fs/promises"

import { prisma } from "@/prisma"

import { updateProjectSchema } from "@/schemas/updateProject"

import { createSharedFn } from "@/server/createSharedFn"
import { ensureProjectRoot } from "@/server/ensureProjectRoot"
import { getProjectComposePath, getProjectDir } from "@/server/getProjectPaths"
import { writeTextToFile } from "@/server/writeTextToFile"

import { ClientError } from "@/utils/clientError"

export const updateProject = createSharedFn({
    name: "updateProject",
    schema: updateProjectSchema,
})(async function updateProject({ name, content }) {
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
})
