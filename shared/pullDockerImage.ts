import { pullDockerImageSchema } from "@/schemas/pullDockerImage"

import { createSharedFn } from "@/server/createSharedFn"
import { runDockerCommand } from "@/server/docker"
import { inspectDockerImage, replaceDockerImage } from "@/server/dockerImage"

export interface PullDockerImageResult {
    name: string
    output: string
    backupName?: string
    skipFollowUp?: boolean
    skipMessage?: string
}

function getPullDockerImageOutput(stdout: string, stderr: string) {
    return `${stdout}${stderr}`.trim()
}

export const pullDockerImage = createSharedFn({
    name: "pullDockerImage",
    schema: pullDockerImageSchema,
})(async function pullDockerImage({ name }) {
    const currentImage = await inspectDockerImage(name)
    const { stdout, stderr } = await runDockerCommand({
        args: ["pull", name],
        errorMessage: `拉取镜像 ${name} 失败`,
    })

    const output = getPullDockerImageOutput(stdout, stderr)

    // docker pull 成功后，目标 tag 已经指向最新镜像，只需要为旧镜像补一个时间戳备份 tag
    const nextImage = await inspectDockerImage(name)

    if (nextImage.id === currentImage.id) {
        return {
            name,
            output,
            skipFollowUp: true,
            skipMessage: "拉取后的镜像和当前镜像 hash 值一致，已跳过默认替换流程",
        } as PullDockerImageResult
    }

    const replaceResult = await replaceDockerImage({
        currentImage,
        newImageId: nextImage.id,
        targetName: name,
    })

    return {
        backupName: replaceResult.backupName,
        name,
        output,
        skipFollowUp: replaceResult.skipFollowUp,
        skipMessage: replaceResult.skipMessage,
    } as PullDockerImageResult
})
