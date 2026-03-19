import { prisma } from "@/prisma"

import { deleteProjectSchema } from "@/schemas/deleteProject"

import { createSharedFn } from "@/server/createSharedFn"
import { deleteFileOrFolder } from "@/server/deleteFileOrFolder"
import { runDockerCommand } from "@/server/docker"
import { ensureProjectRoot } from "@/server/ensureProjectRoot"
import { getProjectComposePath, getProjectDir, getProjectHostDir } from "@/server/getProjectPaths"

import { ensureProjectComposeFile } from "@/shared/runProject"

import { ClientError } from "@/utils/clientError"
import { normalizeComposeProjectContent } from "@/utils/compose"

function getDockerComposeDownArgs(composePath: string, projectHostDir: string) {
    return ["compose", "--project-directory", projectHostDir, "-f", composePath, "down"]
}

export const deleteProject = createSharedFn({
    name: "deleteProject",
    schema: deleteProjectSchema,
})(async function deleteProject({ name, cleanup }) {
    await ensureProjectRoot()
    const projectDir = getProjectDir(name)
    const projectHostDir = getProjectHostDir(name)
    const composePath = getProjectComposePath(name)

    const project = await prisma.project.findUnique({ where: { name } })
    if (!project) throw new ClientError("项目不存在")

    if (cleanup) {
        await ensureProjectComposeFile({
            projectDir,
            composePath,
            content: normalizeComposeProjectContent({
                content: project.content,
            }),
        })
        await runDockerCommand({
            args: getDockerComposeDownArgs(composePath, projectHostDir),
            cwd: projectDir,
            errorMessage: "清理容器失败",
        })
    }

    await prisma.project.delete({ where: { name } })

    await deleteFileOrFolder(projectDir)

    return {
        name,
    }
})
