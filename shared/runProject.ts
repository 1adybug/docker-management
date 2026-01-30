import { stat } from "node:fs/promises"

import { execAsync } from "soda-nodejs"

import { ProjectCommand } from "@/schemas/projectCommand"
import { RunProjectParams } from "@/schemas/runProject"

import { ensureProjectRoot } from "@/server/ensureProjectRoot"
import { getProjectComposePath, getProjectDir } from "@/server/getProjectPaths"
import { isAdmin } from "@/server/isAdmin"

import { ClientError } from "@/utils/clientError"

export interface RunProjectResult {
    output: string
}

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

function getDockerComposeCommand(command: ProjectCommand, composePath: string) {
    const composeArg = wrapShellValue(composePath)

    if (command === ProjectCommand.启动) return `docker compose -f ${composeArg} up -d`
    if (command === ProjectCommand.停止) return `docker compose -f ${composeArg} down`
    if (command === ProjectCommand.重启) return `docker compose -f ${composeArg} restart`
    if (command === ProjectCommand.拉取) return `docker compose -f ${composeArg} pull`
    return `docker compose -f ${composeArg} logs --tail 200`
}

export async function runProject({ name, command }: RunProjectParams) {
    await ensureProjectRoot()
    const composePath = getProjectComposePath(name)
    const projectDir = getProjectDir(name)

    try {
        await stat(composePath)
    } catch {
        throw new ClientError("项目不存在")
    }

    const commandText = getDockerComposeCommand(command, composePath)

    try {
        const output = await execAsync(commandText, { cwd: projectDir })

        return {
            output: output.trim(),
        } as RunProjectResult
    } catch (error) {
        const execError = error as ExecAsyncError
        const stdoutText = normalizeExecOutput(execError.stdout)
        const stderrText = normalizeExecOutput(execError.stderr)
        const messageText = execError.message ?? ""
        const output = `${stdoutText}${stderrText}${messageText}`.trim()

        throw new ClientError(output || "项目执行失败")
    }
}

runProject.filter = isAdmin
