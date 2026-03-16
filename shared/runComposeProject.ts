import { ComposeProjectCommand } from "@/schemas/composeProjectCommand"
import { runComposeProjectSchema } from "@/schemas/runComposeProject"

import { createSharedFn } from "@/server/createSharedFn"
import { ensureNotCurrentDockerComposeProject, resolveComposeFiles, runDockerCommand } from "@/server/docker"

export interface RunComposeProjectResult {
    output: string
}

function getDockerComposeArgs(command: ComposeProjectCommand, composeFiles: string[]) {
    const composeArgs = composeFiles.flatMap(item => ["-f", item])
    const baseArgs = ["compose", ...composeArgs]

    if (command === ComposeProjectCommand.启动) return [...baseArgs, "up", "-d"]
    if (command === ComposeProjectCommand.停止) return [...baseArgs, "down"]
    if (command === ComposeProjectCommand.重启) return [...baseArgs, "restart"]
    if (command === ComposeProjectCommand.拉取) return [...baseArgs, "pull"]
    if (command === ComposeProjectCommand.删除) return [...baseArgs, "down", "--remove-orphans"]
    return [...baseArgs, "logs", "--tail", "200"]
}

export const runComposeProject = createSharedFn({
    name: "runComposeProject",
    schema: runComposeProjectSchema,
})(async function runComposeProject({ composeFiles, command }) {
    if (command === ComposeProjectCommand.停止 || command === ComposeProjectCommand.重启 || command === ComposeProjectCommand.删除) {
        await ensureNotCurrentDockerComposeProject(composeFiles)
    }

    const resolvedComposeFiles = await resolveComposeFiles(composeFiles)
    const result = await runDockerCommand({
        args: getDockerComposeArgs(command, resolvedComposeFiles.files),
        cwd: resolvedComposeFiles.cwd,
        errorMessage: "项目执行失败",
    })

    return {
        output: result.stdout.trim(),
    } as RunComposeProjectResult
})
