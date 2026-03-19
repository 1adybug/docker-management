import { dockerImageNameParser } from "@/schemas/dockerImageName"

import { runDockerCommand } from "@/server/docker"

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
    backupName?: string
    skipFollowUp?: boolean
    skipMessage?: string
    targetName: string
}

export interface DockerImageReferenceRaw {
    Repository?: string
    Tag?: string
    ID?: string
}

export interface DockerImageReferenceItem {
    id: string
    name: string
}

export interface ResolveAvailableDockerImageNameParams {
    currentImageId: string
    excludedNames?: string[]
    preferredName: string
}

export function getDockerImageNameParts(name: string) {
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

export function getDockerImageNameByRepositoryAndTag(repository: string, tag: string) {
    const nextRepository = repository.trim()
    const nextTag = tag.trim()

    if (!nextRepository) throw new ClientError("镜像名称无效")
    if (!nextTag) throw new ClientError("镜像 tag 不能为空")

    return `${nextRepository}:${nextTag}`
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

function isNoneDockerImageValue(value: string) {
    return value.trim() === "<none>"
}

function parseDockerImageReferenceOutput(output: string) {
    return output
        .split(/\r?\n/u)
        .map(line => line.trim())
        .filter(Boolean)
        .map(line => {
            try {
                return JSON.parse(line) as DockerImageReferenceRaw
            } catch {
                return null
            }
        })
        .filter((item): item is DockerImageReferenceRaw => !!item)
        .map(item => {
            const repository = item.Repository ?? ""
            const tag = item.Tag ?? ""
            const id = item.ID ?? ""

            if (!repository || !tag || !id) return null
            if (isNoneDockerImageValue(repository) || isNoneDockerImageValue(tag)) return null

            return {
                id,
                name: `${repository}:${tag}`,
            } as DockerImageReferenceItem
        })
        .filter((item): item is DockerImageReferenceItem => !!item)
}

export async function inspectDockerImage(reference: string) {
    try {
        const result = await runDockerCommand({
            args: ["image", "inspect", reference, "--format", "{{json .}}"],
            errorMessage: `镜像 ${reference} 不存在`,
        })

        const image = parseDockerImageInspectOutput(result.stdout)

        if (!image.id) throw new ClientError(`镜像 ${reference} 不存在`)

        return image
    } catch (error) {
        throw new ClientError({
            message: `镜像 ${reference} 不存在`,
            origin: error,
        })
    }
}

export async function queryDockerImageReferenceItems() {
    const result = await runDockerCommand({
        args: ["image", "ls", "--no-trunc", "--format", "{{json .}}"],
        errorMessage: "查询镜像失败",
    })

    return parseDockerImageReferenceOutput(result.stdout)
}

export async function inspectDockerImageOptional(reference: string) {
    try {
        return await inspectDockerImage(reference)
    } catch {
        return undefined
    }
}

export async function tagDockerImage({ source, target }: TagDockerImageParams) {
    await runDockerCommand({
        args: ["image", "tag", source, target],
        errorMessage: "镜像打标签失败",
    })
}

export async function removeDockerImageTag({ name }: RemoveDockerImageTagParams) {
    await runDockerCommand({
        args: ["image", "rm", name],
        errorMessage: "删除镜像标签失败",
    })
}

export async function clearTemporaryDockerImageTag({ newImageId, targetName, temporaryName }: ReplaceDockerImageParams) {
    if (!temporaryName || temporaryName === targetName) return

    const currentTemporaryImage = await inspectDockerImageOptional(temporaryName)

    if (currentTemporaryImage?.id === newImageId) await removeDockerImageTag({ name: temporaryName })
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

    if (oldImage.id === newImageId) {
        await clearTemporaryDockerImageTag({
            currentImage,
            newImageId,
            targetName,
            temporaryName,
        })

        return {
            skipFollowUp: true,
            skipMessage: "上传的镜像和当前镜像 hash 值一致，已跳过默认替换流程",
            targetName,
        } as ReplaceDockerImageResult
    }

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

    await clearTemporaryDockerImageTag({
        currentImage,
        newImageId,
        targetName,
        temporaryName,
    })

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
