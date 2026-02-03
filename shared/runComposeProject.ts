import { stat } from "node:fs/promises"
import { dirname } from "node:path"

import { execAsync } from "soda-nodejs"

import { ComposeProjectCommand } from "@/schemas/composeProjectCommand"
import { RunComposeProjectParams } from "@/schemas/runComposeProject"

import { isAdmin } from "@/server/isAdmin"

import { ClientError } from "@/utils/clientError"

export interface RunComposeProjectResult {
    output: string
}

export interface ExecAsyncError {
    stdout?: string | Buffer
    stderr?: string | Buffer
    message?: string
}

/** 路径错误信息 */
export interface PathError extends Error {
    code?: string
}

function wrapShellValue(value: string) {
    return `"${value.replace(/"/g, '\\"')}"`
}

function normalizeExecOutput(value?: string | Buffer) {
    if (typeof value === "string") return value
    return value?.toString() ?? ""
}

function normalizeComposeFiles(files: string[]) {
    const items = files.map(item => item.trim()).filter(Boolean)
    return Array.from(new Set(items))
}

function getDockerComposeCommand(command: ComposeProjectCommand, composeFiles: string[]) {
    const composeArgs = composeFiles.map(item => `-f ${wrapShellValue(item)}`).join(" ")

    if (command === ComposeProjectCommand.启动) return `docker compose ${composeArgs} up -d`
    if (command === ComposeProjectCommand.停止) return `docker compose ${composeArgs} down`
    if (command === ComposeProjectCommand.重启) return `docker compose ${composeArgs} restart`
    if (command === ComposeProjectCommand.拉取) return `docker compose ${composeArgs} pull`
    if (command === ComposeProjectCommand.删除) return `docker compose ${composeArgs} down --remove-orphans`
    return `docker compose ${composeArgs} logs --tail 200`
}

async function ensureComposeFiles(files: string[]) {
    const normalized = normalizeComposeFiles(files)
    if (!normalized.length) throw new ClientError("compose 文件无效")

    for (const file of normalized) {
        try {
            const fileStat = await stat(file)
            if (!fileStat.isFile()) throw new ClientError(`compose 文件无效：${file}`)
        } catch (error) {
            const pathError = error as PathError
            if (pathError?.code === "ENOENT") throw new ClientError(`compose 文件不存在：${file}`)
            throw error
        }
    }

    return normalized
}

export async function runComposeProject({ composeFiles, command }: RunComposeProjectParams) {
    const files = await ensureComposeFiles(composeFiles)
    const commandText = getDockerComposeCommand(command, files)
    const cwd = dirname(files[0])

    try {
        const output = await execAsync(commandText, { cwd })

        return {
            output: output.trim(),
        } as RunComposeProjectResult
    } catch (error) {
        const execError = error as ExecAsyncError
        const stdoutText = normalizeExecOutput(execError.stdout)
        const stderrText = normalizeExecOutput(execError.stderr)
        const messageText = execError.message ?? ""
        const output = `${stdoutText}${stderrText}${messageText}`.trim()

        throw new ClientError(output || "项目执行失败")
    }
}

runComposeProject.filter = isAdmin
