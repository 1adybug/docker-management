import { stat } from "node:fs/promises"

import { spawnAsync } from "soda-nodejs"

import { ProjectCommand } from "@/schemas/projectCommand"
import { RunProjectParams } from "@/schemas/runProject"

import { collectStreamText } from "@/server/collectStreamText"
import { ensureProjectRoot } from "@/server/ensureProjectRoot"
import { getProjectComposePath, getProjectDir } from "@/server/getProjectPaths"
import { isAdmin } from "@/server/isAdmin"

import { ClientError } from "@/utils/clientError"

export interface RunProjectResult {
    output: string
}

function getDockerComposeArgs(command: ProjectCommand, composePath: string) {
    if (command === ProjectCommand.启动) return ["compose", "-f", composePath, "up", "-d"]
    if (command === ProjectCommand.停止) return ["compose", "-f", composePath, "down"]
    if (command === ProjectCommand.重启) return ["compose", "-f", composePath, "restart"]
    if (command === ProjectCommand.拉取) return ["compose", "-f", composePath, "pull"]
    return ["compose", "-f", composePath, "logs", "--tail", "200"]
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

    const args = getDockerComposeArgs(command, composePath)
    const promise = spawnAsync("docker", args, { cwd: projectDir })

    const [stdoutText, stderrText] = await Promise.all([collectStreamText(promise.child.stdout), collectStreamText(promise.child.stderr)])

    await promise

    const output = `${stdoutText}${stderrText}`.trim()

    return {
        output,
    } as RunProjectResult
}

runProject.filter = isAdmin
