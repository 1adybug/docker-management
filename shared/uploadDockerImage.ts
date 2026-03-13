import { join } from "node:path"

import { execAsync } from "soda-nodejs"

import { uploadDockerImageSchema } from "@/schemas/uploadDockerImage"

import { createSharedFn } from "@/server/createSharedFn"
import { getReplaceDockerTemporaryName, inspectDockerImage, replaceDockerImage } from "@/server/dockerImage"
import { createDockerTempDirectory, deleteDockerTempDirectory } from "@/server/dockerTempDirectory"
import { isAdmin } from "@/server/isAdmin"
import { writeWebFileToPath } from "@/server/writeWebFileToPath"

import { ClientError } from "@/utils/clientError"

export interface UploadDockerImageResult {
    /** docker load 的输出 */
    output: string
    backupName?: string
    name?: string
}

function getUploadFile(formData: FormData) {
    const file = formData.get("file")

    if (!(file instanceof File)) throw new ClientError("请先选择 tar 文件")

    if (file.size <= 0) throw new ClientError("上传的 tar 文件不能为空")

    if (!file.name.toLowerCase().endsWith(".tar")) throw new ClientError("仅支持上传 tar 文件")

    return file
}

function getOptionalFormText(formData: FormData, key: string) {
    const value = formData.get(key)

    if (typeof value !== "string") return undefined

    const nextValue = value.trim()

    return nextValue || undefined
}

export interface LoadedDockerImageRefs {
    ids: string[]
    names: string[]
}

function getLoadedDockerImageRefs(output: string) {
    const lines = output
        .split(/\r?\n/u)
        .map(line => line.trim())
        .filter(Boolean)

    const names = lines.map(line => line.match(/^Loaded image:\s+(.+)$/u)?.[1]?.trim()).filter((item): item is string => !!item)

    const ids = lines.map(line => line.match(/^Loaded image ID:\s+(.+)$/u)?.[1]?.trim()).filter((item): item is string => !!item)

    return {
        ids,
        names,
    } as LoadedDockerImageRefs
}

export interface ResolveLoadedDockerImageParams {
    output: string
    targetName: string
}

export interface LoadedDockerImageInfo {
    id: string
    temporaryName?: string
}

async function resolveLoadedDockerImage({ output, targetName }: ResolveLoadedDockerImageParams) {
    const loadedRefs = getLoadedDockerImageRefs(output)
    const matchedName = loadedRefs.names.find(item => item === targetName) ?? loadedRefs.names[0]

    if (matchedName) {
        const image = await inspectDockerImage(matchedName)

        return {
            id: image.id,
            temporaryName: matchedName === targetName ? undefined : matchedName,
        } as LoadedDockerImageInfo
    }

    const matchedId = loadedRefs.ids[0]

    if (matchedId) {
        return {
            id: matchedId,
        } as LoadedDockerImageInfo
    }

    throw new ClientError("未识别到上传后的镜像")
}

export const uploadDockerImage = createSharedFn<FormData>({
    name: "uploadDockerImage",
    schema: uploadDockerImageSchema,
    filter: isAdmin,
})(async function uploadDockerImage(formData) {
    const file = getUploadFile(formData)
    const targetName = getOptionalFormText(formData, "targetName")
    const currentImage = targetName ? await inspectDockerImage(targetName) : undefined
    const directory = await createDockerTempDirectory({
        prefix: "docker-management-image-",
    })
    const path = join(directory, "image.tar")

    try {
        await writeWebFileToPath({ file, path })

        const output = await execAsync(`docker load -i "${path}"`)

        if (!targetName) {
            return {
                output,
            } as UploadDockerImageResult
        }

        const loadedImage = await resolveLoadedDockerImage({ output, targetName })
        const temporaryName = loadedImage.temporaryName ?? getReplaceDockerTemporaryName(targetName)

        if (!loadedImage.temporaryName) await execAsync(`docker image tag ${loadedImage.id} ${temporaryName}`)

        const replaceResult = await replaceDockerImage({
            currentImage,
            newImageId: loadedImage.id,
            targetName,
            temporaryName,
        })

        return {
            backupName: replaceResult.backupName,
            name: targetName,
            output,
        } as UploadDockerImageResult
    } finally {
        await deleteDockerTempDirectory(directory)
    }
})
