import { mkdir, stat } from "node:fs/promises"

import { prisma } from "@/prisma"

import { ProjectCommand } from "@/schemas/projectCommand"
import { runProjectSchema } from "@/schemas/runProject"

import { createSharedFn } from "@/server/createSharedFn"
import { runDockerCommand } from "@/server/docker"
import { ensureComposeMountPaths } from "@/server/ensureComposeMountPaths"
import { ensureProjectRoot } from "@/server/ensureProjectRoot"
import { getProjectComposePath, getProjectDir, getProjectHostDir } from "@/server/getProjectPaths"
import { readTextFromFile } from "@/server/readTextFromFile"
import { writeTextToFile } from "@/server/writeTextToFile"

import { ClientError } from "@/utils/clientError"
import { normalizeComposeProjectContent } from "@/utils/compose"

export interface RunProjectResult {
    output: string
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

/** Docker Compose 命令参数 */
export interface GetDockerComposeArgsParams {
    command: ProjectCommand
    composePath: string
    projectHostDir: string
}

/** 执行项目命令参数 */
export interface RunProjectCommandParams extends GetDockerComposeArgsParams {
    projectDir: string
}

function getDockerComposeArgs({ command, composePath, projectHostDir }: GetDockerComposeArgsParams) {
    const args = ["compose", "--project-directory", projectHostDir, "-f", composePath]

    if (command === ProjectCommand.启动) return [...args, "up", "-d"]
    if (command === ProjectCommand.停止) return [...args, "down"]
    if (command === ProjectCommand.重启) throw new ClientError("重启项目必须走平台停止和启动流程")
    if (command === ProjectCommand.拉取) return [...args, "pull"]
    return [...args, "logs", "--tail", "200"]
}

async function runProjectCommand({ command, composePath, projectDir, projectHostDir }: RunProjectCommandParams) {
    const result = await runDockerCommand({
        args: getDockerComposeArgs({
            command,
            composePath,
            projectHostDir,
        }),
        cwd: projectDir,
        errorMessage: "项目执行失败",
    })

    return result.stdout.trim()
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

export const runProject = createSharedFn({
    name: "runProject",
    schema: runProjectSchema,
})(async function runProject({ name, command, mountPathOptions }) {
    await ensureProjectRoot()
    const composePath = getProjectComposePath(name)
    const projectDir = getProjectDir(name)
    const projectHostDir = getProjectHostDir(name)

    const project = await prisma.project.findUnique({ where: { name } })
    if (!project) throw new ClientError("项目不存在")

    const content = normalizeComposeProjectContent({
        content: project.content,
    })

    await ensureProjectComposeFile({
        projectDir,
        composePath,
        content,
    })

    if (command === ProjectCommand.重启) {
        const stopOutput = await runProjectCommand({
            command: ProjectCommand.停止,
            composePath,
            projectDir,
            projectHostDir,
        })

        await ensureComposeMountPaths({
            projectDir,
            content,
            mountPathOptions,
        })

        const startOutput = await runProjectCommand({
            command: ProjectCommand.启动,
            composePath,
            projectDir,
            projectHostDir,
        })

        return {
            output: [stopOutput, startOutput].filter(Boolean).join("\n"),
        } as RunProjectResult
    }

    if (command === ProjectCommand.启动) {
        await ensureComposeMountPaths({
            projectDir,
            content,
            mountPathOptions,
        })
    }

    return {
        output: await runProjectCommand({
            command,
            composePath,
            projectDir,
            projectHostDir,
        }),
    } as RunProjectResult
})
