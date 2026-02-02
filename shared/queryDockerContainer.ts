import { normalize, sep } from "node:path"

import { execAsync } from "soda-nodejs"

import { prisma } from "@/prisma"

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

/** 项目配置文件路径标签 */
const composeConfigLabel = "com.docker.compose.project.config_files"

async function getManagedProjectSet() {
    const projects = await prisma.project.findMany({
        select: {
            name: true,
        },
    })
    return new Set(projects.map(project => project.name))
}

function normalizePath(value: string) {
    return normalize(value).toLowerCase()
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

function getComposeConfigFilesByLabels(labels?: string) {
    const map = parseLabels(labels)
    const raw = map[composeConfigLabel]
    if (!raw) return []
    return raw
        .split(",")
        .map(item => item.trim())
        .filter(Boolean)
}

function isComposeFileManaged(files: string[], projectRoot: string) {
    if (files.length === 0) return false
    const normalizedRoot = normalizePath(projectRoot)
    const rootWithSeparator = normalizedRoot.endsWith(sep) ? normalizedRoot : `${normalizedRoot}${sep}`
    return files.some(file => normalizePath(file).startsWith(rootWithSeparator))
}

export async function queryDockerContainer() {
    const output = await execAsync(`docker ps -a --format "{{json .}}"`)
    const projectRoot = await ensureProjectRoot()
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
            const composeFiles = getComposeConfigFilesByLabels(item.Labels)
            const isManagedProject =
                composeFiles.length > 0 ? isComposeFileManaged(composeFiles, projectRoot) : projectName ? managedProjects.has(projectName) : false

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
