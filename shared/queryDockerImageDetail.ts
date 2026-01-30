import { readdir } from "node:fs/promises"

import { execAsync } from "soda-nodejs"
import { parse } from "yaml"

import { ensureProjectRoot } from "@/server/ensureProjectRoot"
import { getProjectComposePath } from "@/server/getProjectPaths"
import { isAdmin } from "@/server/isAdmin"
import { readTextFromFile } from "@/server/readTextFromFile"

export interface ComposeService {
    image?: string
}

export interface ComposeServiceMap {
    [key: string]: ComposeService
}

export interface ComposeFile {
    services?: ComposeServiceMap
}

export interface DockerImageRaw {
    Repository?: string
    Tag?: string
    ID?: string
    CreatedAt?: string
    Size?: string
}

export interface DockerImageItem {
    id: string
    name: string
    repository: string
    tag: string
    createdAt: string
    size: string
    projects: string[]
}

async function getProjectImageUsageMap() {
    const root = await ensureProjectRoot()
    const entries = await readdir(root, { withFileTypes: true })
    const usage = new Map<string, Set<string>>()

    await Promise.all(
        entries
            .filter(entry => entry.isDirectory())
            .map(async entry => {
                const projectName = entry.name
                const composePath = getProjectComposePath(projectName)

                try {
                    const content = await readTextFromFile(composePath)
                    const compose = parse(content) as ComposeFile | null
                    const services = compose?.services ?? {}

                    Object.values(services).forEach(service => {
                        const image = service?.image?.trim()
                        if (!image) return

                        const imageItems = image.includes(":") ? [image] : [image, `${image}:latest`]

                        imageItems.forEach(item => {
                            if (!usage.has(item)) usage.set(item, new Set<string>())
                            usage.get(item)?.add(projectName)
                        })
                    })
                } catch {}
            }),
    )

    return usage
}

function normalizeImageName(repository: string, tag: string) {
    if (!repository || repository === "<none>") return ""
    if (!tag || tag === "<none>") return repository
    return `${repository}:${tag}`
}

export async function queryDockerImageDetail() {
    const output = await execAsync(`docker images --format "{{json .}}"`)
    const usageMap = await getProjectImageUsageMap()

    const images = output
        .split(/\r?\n/u)
        .map(line => line.trim())
        .filter(Boolean)
        .map(line => {
            try {
                return JSON.parse(line) as DockerImageRaw
            } catch {
                return null
            }
        })
        .filter((item): item is DockerImageRaw => !!item)
        .map(item => {
            const repository = item.Repository ?? ""
            const tag = item.Tag ?? ""
            const name = normalizeImageName(repository, tag)
            if (!name) return null

            const projects = Array.from(usageMap.get(name) ?? new Set<string>())

            return {
                id: item.ID ?? "",
                name,
                repository,
                tag,
                createdAt: item.CreatedAt ?? "",
                size: item.Size ?? "",
                projects,
            } as DockerImageItem
        })
        .filter((item): item is DockerImageItem => !!item)

    return images
}

queryDockerImageDetail.filter = isAdmin
