import { execAsync } from "soda-nodejs"

import { DockerContainerCommand } from "@/schemas/dockerContainerCommand"
import { RunDockerContainerParams } from "@/schemas/runDockerContainer"

import { isAdmin } from "@/server/isAdmin"

export interface RunDockerContainerResult {
    id: string
    output: string
}

function getContainerArgs(command: DockerContainerCommand, id: string) {
    if (command === DockerContainerCommand.停止) return ["stop", id]
    if (command === DockerContainerCommand.暂停) return ["pause", id]
    if (command === DockerContainerCommand.重启) return ["restart", id]
    return ["rm", "-f", id]
}

export async function runDockerContainer({ id, command }: RunDockerContainerParams) {
    const args = getContainerArgs(command, id)
    const output = await execAsync(`docker ${args.join(" ")}`)

    return {
        id,
        output,
    } as RunDockerContainerResult
}

runDockerContainer.filter = isAdmin
