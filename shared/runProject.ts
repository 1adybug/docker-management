import { mkdir, stat } from "node:fs/promises"

import { execAsync } from "soda-nodejs"

import { prisma } from "@/prisma"

import { ProjectCommand } from "@/schemas/projectCommand"
import { RunProjectParams } from "@/schemas/runProject"

import { ensureProjectRoot } from "@/server/ensureProjectRoot"
import { getProjectComposePath, getProjectDir } from "@/server/getProjectPaths"
import { isAdmin } from "@/server/isAdmin"
import { readTextFromFile } from "@/server/readTextFromFile"
import { writeTextToFile } from "@/server/writeTextToFile"

import { ClientError } from "@/utils/clientError"

export interface RunProjectResult {
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

/** 同步 compose 文件参数 */
export interface EnsureProjectComposeFileParams {
    /** 项目目录 */
    projectDir: string
    /** compose 文件路径 */
    composePath: string
    /** compose 内容 */
    content: string
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

function isNoEntryError(error: unknown) {
    const pathError = error as PathError
    return pathError?.code === "ENOENT"
}

async function getPathStat(path: string) {
    try {
        return await stat(path)
    } catch (error) {
        if (isNoEntryError(error)) return undefined
        throw error
    }
}

/** 检查并同步项目的 compose 文件 */
export async function ensureProjectComposeFile({ projectDir, composePath, content }: EnsureProjectComposeFileParams) {
    const projectDirStat = await getPathStat(projectDir)

    if (!projectDirStat) await mkdir(projectDir, { recursive: true })
    else if (!projectDirStat.isDirectory()) throw new ClientError("项目目录无效")

    const composeStat = await getPathStat(composePath)

    if (!composeStat) {
        await writeTextToFile(composePath, content)
        return
    }

    if (!composeStat.isFile()) throw new ClientError("docker-compose.yml 无效")

    const localContent = await readTextFromFile(composePath)

    if (localContent !== content) await writeTextToFile(composePath, content)
}

export async function runProject({ name, command }: RunProjectParams) {
    await ensureProjectRoot()
    const composePath = getProjectComposePath(name)
    const projectDir = getProjectDir(name)

    const project = await prisma.project.findUnique({ where: { name } })
    if (!project) throw new ClientError("项目不存在")

    await ensureProjectComposeFile({ projectDir, composePath, content: project.content })

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
