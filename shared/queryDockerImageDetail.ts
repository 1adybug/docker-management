import { parse } from "yaml"

import { prisma } from "@/prisma"

import { createSharedFn } from "@/server/createSharedFn"
import { runDockerCommand } from "@/server/docker"

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
    projectItems: DockerImageProjectItem[]
}

export interface DockerImageProjectItem {
    name: string
    displayName: string
}

async function getProjectImageUsageMap() {
    const usage = new Map<string, Set<string>>()
    const projects = await prisma.project.findMany({
        select: {
            name: true,
            xName: true,
            content: true,
        },
    })

    await Promise.all(
        projects.map(async project => {
            try {
                const compose = parse(project.content) as ComposeFile | null
                const services = compose?.services ?? {}

                Object.values(services).forEach(service => {
                    const image = service?.image?.trim()
                    if (!image) return

                    const imageItems = image.includes(":") ? [image] : [image, `${image}:latest`]

                    imageItems.forEach(item => {
                        if (!usage.has(item)) usage.set(item, new Set<string>())
                        usage.get(item)?.add(project.name)
                    })
                })
            } catch {}
        }),
    )

    const projectNameMap = new Map(projects.map(project => [project.name, project.xName || project.name]))

    return {
        usage,
        projectNameMap,
    }
}

function normalizeImageName(repository: string, tag: string) {
    if (!repository || repository === "<none>") return ""
    if (!tag || tag === "<none>") return repository
    return `${repository}:${tag}`
}

export const queryDockerImageDetail = createSharedFn<never>({
    name: "queryDockerImageDetail",
})(async function queryDockerImageDetail() {
    const result = await runDockerCommand({
        args: ["images", "--format", "{{json .}}"],
        errorMessage: "查询镜像详情失败",
    })

    const output = result.stdout
    const { usage, projectNameMap } = await getProjectImageUsageMap()

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

            const projects = Array.from(usage.get(name) ?? new Set<string>())

            const projectItems = projects.map(projectName => ({
                name: projectName,
                displayName: projectNameMap.get(projectName) ?? projectName,
            }))

            return {
                id: item.ID ?? "",
                name,
                repository,
                tag,
                createdAt: item.CreatedAt ?? "",
                size: item.Size ?? "",
                projects,
                projectItems,
            } as DockerImageItem
        })
        .filter((item): item is DockerImageItem => !!item)

    return images
})
