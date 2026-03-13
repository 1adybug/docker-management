import { execAsync } from "soda-nodejs"

import { deleteDockerImageSchema } from "@/schemas/deleteDockerImage"

import { createSharedFn } from "@/server/createSharedFn"

export interface DeleteDockerImageResult {
    name: string
}

export const deleteDockerImage = createSharedFn({
    name: "deleteDockerImage",
    schema: deleteDockerImageSchema,
})(async function deleteDockerImage({ name }) {
    await execAsync(`docker rmi ${name}`)

    return {
        name,
    } as DeleteDockerImageResult
})
