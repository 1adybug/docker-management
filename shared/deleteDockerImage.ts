import { deleteDockerImageSchema } from "@/schemas/deleteDockerImage"

import { createSharedFn } from "@/server/createSharedFn"
import { runDockerCommand } from "@/server/docker"

export interface DeleteDockerImageResult {
    name: string
}

export const deleteDockerImage = createSharedFn({
    name: "deleteDockerImage",
    schema: deleteDockerImageSchema,
})(async function deleteDockerImage({ name }) {
    await runDockerCommand({
        args: ["rmi", name],
        errorMessage: "删除镜像失败",
    })

    return {
        name,
    } as DeleteDockerImageResult
})
