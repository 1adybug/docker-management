import { mkdir, stat } from "node:fs/promises"

import { prisma } from "@/prisma"

import { addProjectSchema } from "@/schemas/addProject"

import { createSharedFn } from "@/server/createSharedFn"
import { ensureProjectRoot } from "@/server/ensureProjectRoot"
import { getProjectComposePath, getProjectDir } from "@/server/getProjectPaths"
import { writeTextToFile } from "@/server/writeTextToFile"

import { ClientError } from "@/utils/clientError"
import { getComposeXName, normalizeComposeProjectContent } from "@/utils/compose"

const defaultComposeContent = `services:
    app:
        image: nginx:latest
        ports:
            - "80:80"
`

export const addProject = createSharedFn({
    name: "addProject",
    schema: addProjectSchema,
})(async function addProject({ name, content }) {
    await ensureProjectRoot()
    const projectDir = getProjectDir(name)
    const composePath = getProjectComposePath(name)

    const project = await prisma.project.findUnique({ where: { name } })
    if (project) throw new ClientError("项目已存在")

    try {
        await stat(projectDir)
        throw new ClientError("项目已存在")
    } catch {}

    await mkdir(projectDir, { recursive: true })

    const nextContent = normalizeComposeProjectContent({
        content: content ?? defaultComposeContent,
    })

    const xName = getComposeXName(nextContent)

    if (!xName) throw new ClientError("项目名称不能为空")

    const xNameProject = await prisma.project.findUnique({ where: { xName } })
    if (xNameProject) throw new ClientError("项目名称已存在")

    await prisma.project.create({
        data: {
            name,
            xName,
            content: nextContent,
        },
    })

    await writeTextToFile(composePath, nextContent)

    return {
        name,
    }
})
