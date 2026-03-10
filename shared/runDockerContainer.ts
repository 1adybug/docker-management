import { execAsync } from "soda-nodejs"

import { DockerContainerCommand } from "@/schemas/dockerContainerCommand"
import { runDockerContainerSchema } from "@/schemas/runDockerContainer"

import { createSharedFn } from "@/server/createSharedFn"
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

export const runDockerContainer = createSharedFn({
    name: "runDockerContainer",
    schema: runDockerContainerSchema,
    filter: isAdmin,
})(async function runDockerContainer({ id, command }) {
    const args = getContainerArgs(command, id)
    const output = await execAsync(`docker ${args.join(" ")}`)

    return {
        id,
        output,
    } as RunDockerContainerResult
})
