import { execAsync } from "soda-nodejs"

import { isAdmin } from "@/server/isAdmin"

export interface DockerImageItem {
    name: string
}

export async function queryDockerImage() {
    const output = await execAsync(`docker images --format "{{.Repository}}:{{.Tag}}"`)
    const lines = output
        .split(/\r?\n/u)
        .map(item => item.trim())
        .filter(Boolean)
        .filter(item => !item.includes("<none>"))

    const items = Array.from(new Set(lines)).map(name => ({ name })) as DockerImageItem[]

    return items
}

queryDockerImage.filter = isAdmin
