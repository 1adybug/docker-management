import { DockerContainerCommand } from "@/schemas/dockerContainerCommand"
import { runDockerContainerSchema } from "@/schemas/runDockerContainer"

import { createSharedFn } from "@/server/createSharedFn"
import { ensureNotCurrentDockerContainer, runDockerCommand } from "@/server/docker"

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
})(async function runDockerContainer({ id, command }) {
    ensureNotCurrentDockerContainer(id)

    const args = getContainerArgs(command, id)
    const result = await runDockerCommand({
        args,
        errorMessage: "容器执行失败",
    })

    return {
        id,
        output: result.stdout.trim(),
    } as RunDockerContainerResult
})
