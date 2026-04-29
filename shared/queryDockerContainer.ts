import { normalize, sep } from "node:path"

import { prisma } from "@/prisma"

import { createSharedFn } from "@/server/createSharedFn"
import { getComposeConfigFilesByLabels, getComposeProjectNameByLabels, isCurrentDockerContainerId, mapDockerHostPath, runDockerCommand } from "@/server/docker"
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
    projectDisplayName?: string
    isManagedProject?: boolean
    isCurrentContainer?: boolean
}

export interface ManagedProjectInfo {
    id: string
    displayName: string
}

async function getManagedProjectMap() {
    const projects = await prisma.project.findMany({
        select: {
            id: true,
            name: true,
            xName: true,
        },
    })
    return new Map(
        projects.map(project => [
            project.name,
            {
                id: project.id,
                displayName: project.xName || project.name,
            } as ManagedProjectInfo,
        ]),
    )
}

function normalizePath(value: string) {
    return normalize(value).toLowerCase()
}

function isComposeFileManaged(files: string[], projectRoot: string) {
    if (files.length === 0) return false
    const normalizedRoot = normalizePath(projectRoot)
    const rootWithSeparator = normalizedRoot.endsWith(sep) ? normalizedRoot : `${normalizedRoot}${sep}`
    return files.some(file => normalizePath(mapDockerHostPath(file)).startsWith(rootWithSeparator))
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
            const projectInfo = projectName ? managedProjectMap.get(projectName) : undefined
            const projectId = projectInfo?.id
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
                projectDisplayName: projectName ? (projectInfo?.displayName ?? projectName) : undefined,
                isManagedProject,
                isCurrentContainer: isCurrentDockerContainerId(item.ID),
            } as DockerContainerItem
        })

    return containers
})
