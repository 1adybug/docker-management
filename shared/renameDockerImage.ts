import { renameDockerImageSchema } from "@/schemas/renameDockerImage"

import { createSharedFn } from "@/server/createSharedFn"
import {
    getDockerImageNameByRepositoryAndTag,
    getDockerImageNameParts,
    inspectDockerImage,
    inspectDockerImageOptional,
    removeDockerImageTag,
    tagDockerImage,
} from "@/server/dockerImage"

import { ClientError } from "@/utils/clientError"

export interface RenameDockerImageResult {
    sourceName: string
    targetName: string
}

export const renameDockerImage = createSharedFn({
    name: "renameDockerImage",
    schema: renameDockerImageSchema,
})(async function renameDockerImage({ name, tag }) {
    const currentImage = await inspectDockerImage(name)
    const { repository, tag: currentTag } = getDockerImageNameParts(name)

    if (!currentTag) throw new ClientError("当前镜像没有可重命名的 tag")
    if (currentTag === tag) throw new ClientError("新 tag 不能和当前 tag 相同")

    const targetName = getDockerImageNameByRepositoryAndTag(repository, tag)
    const targetImage = await inspectDockerImageOptional(targetName)

    if (targetImage && targetImage.id !== currentImage.id) throw new ClientError(`镜像 ${targetName} 已存在`)

    if (!targetImage) {
        await tagDockerImage({
            source: currentImage.id,
            target: targetName,
        })
    }

    await removeDockerImageTag({ name })

    return {
        sourceName: name,
        targetName,
    } as RenameDockerImageResult
})
