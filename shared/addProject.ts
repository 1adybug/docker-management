import { mkdir, stat } from "node:fs/promises"

import { AddProjectParams } from "@/schemas/addProject"

import { ensureProjectRoot } from "@/server/ensureProjectRoot"
import { getProjectComposePath, getProjectDir } from "@/server/getProjectPaths"
import { isAdmin } from "@/server/isAdmin"
import { writeTextToFile } from "@/server/writeTextToFile"

import { ClientError } from "@/utils/clientError"

const defaultComposeContent = `services:
    app:
        image: nginx:latest
        ports:
            - "80:80"
`

export async function addProject({ name, content }: AddProjectParams) {
    await ensureProjectRoot()
    const projectDir = getProjectDir(name)
    const composePath = getProjectComposePath(name)

    try {
        await stat(projectDir)
        throw new ClientError("项目已存在")
    } catch {}

    await mkdir(projectDir, { recursive: true })

    const nextContent = content ?? defaultComposeContent
    await writeTextToFile(composePath, nextContent)

    return {
        name,
    }
}

addProject.filter = isAdmin
