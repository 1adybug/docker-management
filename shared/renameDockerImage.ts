import { renameDockerImageSchema } from "@/schemas/renameDockerImage"

import { createSharedFn } from "@/server/createSharedFn"
import { getDockerImageNameParts, inspectDockerImage, inspectDockerImageOptional, removeDockerImageTag, tagDockerImage } from "@/server/dockerImage"

import { ClientError } from "@/utils/clientError"

export interface RenameDockerImageResult {
    sourceName: string
    targetName: string
}

export const renameDockerImage = createSharedFn({
    name: "renameDockerImage",
    schema: renameDockerImageSchema,
})(async function renameDockerImage({ name, targetName }) {
    const currentImage = await inspectDockerImage(name)
    const { repository, tag: currentTag } = getDockerImageNameParts(name)

    if (name === targetName) throw new ClientError("新镜像名称不能和当前镜像相同")
    if (currentTag && targetName === `${repository}:${currentTag}`) throw new ClientError("新镜像名称不能和当前镜像相同")

    const targetImage = await inspectDockerImageOptional(targetName)

    if (targetImage && targetImage.id !== currentImage.id) throw new ClientError(`镜像 ${targetName} 已存在`)

    if (!targetImage) {
        await tagDockerImage({
            source: currentImage.id,
            target: targetName,
        })
    }

    if (currentTag) await removeDockerImageTag({ name })

    return {
        sourceName: name,
        targetName,
    } as RenameDockerImageResult
})
