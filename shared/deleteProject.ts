import { execAsync } from "soda-nodejs"

import { prisma } from "@/prisma"

import { deleteProjectSchema } from "@/schemas/deleteProject"

import { createSharedFn } from "@/server/createSharedFn"
import { deleteFileOrFolder } from "@/server/deleteFileOrFolder"
import { ensureProjectRoot } from "@/server/ensureProjectRoot"
import { getProjectComposePath, getProjectDir } from "@/server/getProjectPaths"

import { ensureProjectComposeFile } from "@/shared/runProject"

import { ClientError } from "@/utils/clientError"

/** 命令执行异常 */
export interface ExecAsyncError {
    stdout?: string | Buffer
    stderr?: string | Buffer
    message?: string
}

function wrapShellValue(value: string) {
    return `"${value.replace(/"/g, '\\"')}"`
}

function normalizeExecOutput(value?: string | Buffer) {
    if (typeof value === "string") return value
    return value?.toString() ?? ""
}

function getDockerComposeDownCommand(composePath: string) {
    const composeArg = wrapShellValue(composePath)
    return `docker compose -f ${composeArg} down`
}

export const deleteProject = createSharedFn({
    name: "deleteProject",
    schema: deleteProjectSchema,
})(async function deleteProject({ name, cleanup }) {
    await ensureProjectRoot()
    const projectDir = getProjectDir(name)
    const composePath = getProjectComposePath(name)

    const project = await prisma.project.findUnique({ where: { name } })
    if (!project) throw new ClientError("项目不存在")

    if (cleanup) {
        await ensureProjectComposeFile({ projectDir, composePath, content: project.content })

        const commandText = getDockerComposeDownCommand(composePath)

        try {
            await execAsync(commandText, { cwd: projectDir })
        } catch (error) {
            const execError = error as ExecAsyncError
            const stdoutText = normalizeExecOutput(execError.stdout)
            const stderrText = normalizeExecOutput(execError.stderr)
            const messageText = execError.message ?? ""
            const output = `${stdoutText}${stderrText}${messageText}`.trim()

            throw new ClientError(output || "清理容器失败")
        }
    }

    await prisma.project.delete({ where: { name } })

    await deleteFileOrFolder(projectDir)

    return {
        name,
    }
})
