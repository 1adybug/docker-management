import { execAsync } from "soda-nodejs"

import { dockerImageNameParser } from "@/schemas/dockerImageName"

import { ClientError } from "@/utils/clientError"

export interface DockerImageNameParts {
    repository: string
    tag?: string
}

export interface DockerImageInspectRaw {
    Id?: string
    Created?: string
    RepoTags?: string[]
}

export interface DockerImageInspectInfo {
    id: string
    createdAt: string
    repoTags: string[]
}

export interface TagDockerImageParams {
    source: string
    target: string
}

export interface RemoveDockerImageTagParams {
    name: string
}

export interface ReplaceDockerImageParams {
    currentImage?: DockerImageInspectInfo
    newImageId: string
    targetName: string
    temporaryName?: string
}

export interface ReplaceDockerImageResult {
    backupName: string
    targetName: string
}

export interface ResolveAvailableDockerImageNameParams {
    currentImageId: string
    excludedNames?: string[]
    preferredName: string
}

function getDockerImageNameParts(name: string) {
    const nextName = dockerImageNameParser(name.trim())
    const lastSlashIndex = nextName.lastIndexOf("/")
    const lastColonIndex = nextName.lastIndexOf(":")

    if (lastColonIndex > lastSlashIndex) {
        return {
            repository: nextName.slice(0, lastColonIndex),
            tag: nextName.slice(lastColonIndex + 1),
        } as DockerImageNameParts
    }

    return {
        repository: nextName,
    } as DockerImageNameParts
}

function formatTwoDigits(value: number) {
    return String(value).padStart(2, "0")
}

export function formatDockerImageTimeTag(date: Date) {
    if (Number.isNaN(date.getTime())) throw new ClientError("镜像时间无效")

    const year = formatTwoDigits(date.getFullYear() % 100)
    const month = formatTwoDigits(date.getMonth() + 1)
    const day = formatTwoDigits(date.getDate())
    const hour = formatTwoDigits(date.getHours())
    const minute = formatTwoDigits(date.getMinutes())
    const second = formatTwoDigits(date.getSeconds())
    const weekDay = String(date.getDay())

    return `${year}${month}${day}${hour}${minute}${second}${weekDay}`
}

function parseDockerImageInspectOutput(output: string) {
    const raw = JSON.parse(output.trim()) as DockerImageInspectRaw

    return {
        id: raw.Id ?? "",
        createdAt: raw.Created ?? "",
        repoTags: raw.RepoTags ?? [],
    } as DockerImageInspectInfo
}

export async function inspectDockerImage(reference: string) {
    try {
        const output = await execAsync(`docker image inspect ${reference} --format "{{json .}}"`)
        const image = parseDockerImageInspectOutput(output)

        if (!image.id) throw new ClientError(`镜像 ${reference} 不存在`)

        return image
    } catch (error) {
        throw new ClientError({
            message: `镜像 ${reference} 不存在`,
            origin: error,
        })
    }
}

export async function inspectDockerImageOptional(reference: string) {
    try {
        return await inspectDockerImage(reference)
    } catch {
        return undefined
    }
}

export async function tagDockerImage({ source, target }: TagDockerImageParams) {
    await execAsync(`docker image tag ${source} ${target}`)
}

export async function removeDockerImageTag({ name }: RemoveDockerImageTagParams) {
    await execAsync(`docker image rm ${name}`)
}

async function resolveAvailableDockerImageName({ currentImageId, excludedNames = [], preferredName }: ResolveAvailableDockerImageNameParams) {
    let name = preferredName
    let index = 1

    while (excludedNames.includes(name)) {
        name = `${preferredName}-${index}`
        index += 1
    }

    while (true) {
        const image = await inspectDockerImageOptional(name)

        if (!image || image.id === currentImageId) return name

        name = `${preferredName}-${index}`
        index += 1
    }
}

export async function replaceDockerImage({ currentImage, newImageId, targetName, temporaryName }: ReplaceDockerImageParams) {
    const oldImage = currentImage ?? (await inspectDockerImage(targetName))
    const { repository } = getDockerImageNameParts(targetName)
    const createdAtTag = formatDockerImageTimeTag(new Date(oldImage.createdAt))
    const preferredBackupName = `${repository}:${createdAtTag}`
    const backupName = await resolveAvailableDockerImageName({
        currentImageId: oldImage.id,
        excludedNames: [targetName, temporaryName].filter(Boolean) as string[],
        preferredName: preferredBackupName,
    })

    await tagDockerImage({
        source: oldImage.id,
        target: backupName,
    })

    const currentTargetImage = await inspectDockerImageOptional(targetName)

    if (currentTargetImage && currentTargetImage.id !== newImageId) await removeDockerImageTag({ name: targetName })

    const nextTargetImage = await inspectDockerImageOptional(targetName)

    if (!nextTargetImage || nextTargetImage.id !== newImageId) {
        await tagDockerImage({
            source: newImageId,
            target: targetName,
        })
    }

    if (temporaryName && temporaryName !== targetName) {
        const currentTemporaryImage = await inspectDockerImageOptional(temporaryName)

        if (currentTemporaryImage?.id === newImageId) await removeDockerImageTag({ name: temporaryName })
    }

    return {
        backupName,
        targetName,
    } as ReplaceDockerImageResult
}

export function getReplaceDockerTemporaryName(targetName: string) {
    const { repository } = getDockerImageNameParts(targetName)
    const uploadTimeTag = formatDockerImageTimeTag(new Date())

    return `${repository}:${uploadTimeTag}`
}
