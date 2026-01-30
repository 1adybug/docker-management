import { readdir } from "node:fs/promises"

import { execAsync } from "soda-nodejs"

import { ensureProjectRoot } from "@/server/ensureProjectRoot"
import { isAdmin } from "@/server/isAdmin"

export interface DockerContainerRaw {
    ID?: string
    Image?: string
    Command?: string
    CreatedAt?: string
    Status?: string
    Names?: string
    Labels?: string
    Ports?: string
}

export interface DockerContainerItem {
    id: string
    name: string
    image: string
    status: string
    createdAt: string
    ports: string
    projectName?: string
    isManagedProject?: boolean
}

export interface DockerLabelMap {
    [key: string]: string
}

async function getManagedProjectSet() {
    const root = await ensureProjectRoot()
    const entries = await readdir(root, { withFileTypes: true })
    const names = entries.filter(entry => entry.isDirectory()).map(entry => entry.name)
    return new Set(names)
}

function parseLabels(labels?: string) {
    const result: DockerLabelMap = {}
    if (!labels) return result

    labels
        .split(",")
        .map(item => item.trim())
        .filter(Boolean)
        .forEach(item => {
            const [key, ...rest] = item.split("=")
            const value = rest.join("=")
            if (!key) return
            result[key] = value
        })

    return result
}

function getProjectNameByLabels(labels?: string) {
    const map = parseLabels(labels)
    return map["com.docker.compose.project"]
}

export async function queryDockerContainer() {
    const output = await execAsync(`docker ps -a --format "{{json .}}"`)
    const managedProjects = await getManagedProjectSet()

    const containers = output
        .split(/\r?\n/u)
        .map(line => line.trim())
        .filter(Boolean)
        .map(line => {
            try {
                return JSON.parse(line) as DockerContainerRaw
            } catch {
                return null
            }
        })
        .filter((item): item is DockerContainerRaw => !!item)
        .map(item => {
            const projectName = getProjectNameByLabels(item.Labels)
            const isManagedProject = projectName ? managedProjects.has(projectName) : false

            return {
                id: item.ID ?? "",
                name: item.Names ?? "",
                image: item.Image ?? "",
                status: item.Status ?? "",
                createdAt: item.CreatedAt ?? "",
                ports: item.Ports ?? "",
                projectName,
                isManagedProject,
            } as DockerContainerItem
        })

    return containers
}

queryDockerContainer.filter = isAdmin
