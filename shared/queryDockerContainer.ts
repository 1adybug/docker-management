import { normalize, sep } from "node:path"

import { prisma } from "@/prisma"

import { createSharedFn } from "@/server/createSharedFn"
import { getComposeConfigFilesByLabels, getComposeProjectNameByLabels, isCurrentDockerContainerId, runDockerCommand } from "@/server/docker"
import { ensureProjectRoot } from "@/server/ensureProjectRoot"

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
    projectId?: string
    composeConfigFiles: string[]
    projectName?: string
    isManagedProject?: boolean
    isCurrentContainer?: boolean
}

async function getManagedProjectMap() {
    const projects = await prisma.project.findMany({
        select: {
            id: true,
            name: true,
        },
    })
    return new Map(projects.map(project => [project.name, project.id]))
}

function normalizePath(value: string) {
    return normalize(value).toLowerCase()
}

function isComposeFileManaged(files: string[], projectRoot: string) {
    if (files.length === 0) return false
    const normalizedRoot = normalizePath(projectRoot)
    const rootWithSeparator = normalizedRoot.endsWith(sep) ? normalizedRoot : `${normalizedRoot}${sep}`
    return files.some(file => normalizePath(file).startsWith(rootWithSeparator))
}

export const queryDockerContainer = createSharedFn<never>({
    name: "queryDockerContainer",
})(async function queryDockerContainer() {
    const result = await runDockerCommand({
        args: ["ps", "-a", "--format", "{{json .}}"],
        errorMessage: "查询容器失败",
    })

    const output = result.stdout
    const projectRoot = await ensureProjectRoot()
    const managedProjectMap = await getManagedProjectMap()

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
            const projectName = getComposeProjectNameByLabels(item.Labels)
            const composeFiles = getComposeConfigFilesByLabels(item.Labels)
            const projectId = projectName ? managedProjectMap.get(projectName) : undefined
            const isManagedProject =
                composeFiles.length > 0 ? isComposeFileManaged(composeFiles, projectRoot) : projectName ? managedProjectMap.has(projectName) : false

            return {
                id: item.ID ?? "",
                name: item.Names ?? "",
                image: item.Image ?? "",
                status: item.Status ?? "",
                createdAt: item.CreatedAt ?? "",
                ports: item.Ports ?? "",
                projectId,
                composeConfigFiles: composeFiles,
                projectName,
                isManagedProject,
                isCurrentContainer: isCurrentDockerContainerId(item.ID),
            } as DockerContainerItem
        })

    return containers
})
