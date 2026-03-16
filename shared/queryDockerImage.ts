import { createSharedFn } from "@/server/createSharedFn"
import { runDockerCommand } from "@/server/docker"

export interface DockerImageItem {
    name: string
}

export const queryDockerImage = createSharedFn<never>({
    name: "queryDockerImage",
})(async function queryDockerImage() {
    const result = await runDockerCommand({
        args: ["images", "--format", "{{.Repository}}:{{.Tag}}"],
        errorMessage: "查询镜像失败",
    })

    const output = result.stdout

    const lines = output
        .split(/\r?\n/u)
        .map(item => item.trim())
        .filter(Boolean)
        .filter(item => !item.includes("<none>"))

    const items = Array.from(new Set(lines)).map(name => ({ name })) as DockerImageItem[]

    return items
})
