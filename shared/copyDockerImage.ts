import { copyDockerImageSchema } from "@/schemas/copyDockerImage"

import { createSharedFn } from "@/server/createSharedFn"
import {
    getDockerImageNameByRepositoryAndTag,
    getDockerImageNameParts,
    inspectDockerImage,
    inspectDockerImageOptional,
    tagDockerImage,
} from "@/server/dockerImage"

import { ClientError } from "@/utils/clientError"

export interface CopyDockerImageResult {
    sourceName: string
    targetName: string
}

export const copyDockerImage = createSharedFn({
    name: "copyDockerImage",
    schema: copyDockerImageSchema,
})(async function copyDockerImage({ name, tag }) {
    const currentImage = await inspectDockerImage(name)
    const { repository, tag: currentTag } = getDockerImageNameParts(name)

    if (!currentTag) throw new ClientError("当前镜像没有可复制的 tag")
    if (currentTag === tag) throw new ClientError("复制后的 tag 不能和当前 tag 相同")

    const targetName = getDockerImageNameByRepositoryAndTag(repository, tag)
    const targetImage = await inspectDockerImageOptional(targetName)

    if (targetImage) throw new ClientError(`镜像 ${targetName} 已存在`)

    await tagDockerImage({
        source: currentImage.id,
        target: targetName,
    })

    return {
        sourceName: name,
        targetName,
    } as CopyDockerImageResult
})
