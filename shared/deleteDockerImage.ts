import { execAsync } from "soda-nodejs"

import { deleteDockerImageSchema } from "@/schemas/deleteDockerImage"

import { createSharedFn } from "@/server/createSharedFn"
import { isAdmin } from "@/server/isAdmin"

export interface DeleteDockerImageResult {
    name: string
}

export const deleteDockerImage = createSharedFn({
    name: "deleteDockerImage",
    schema: deleteDockerImageSchema,
    filter: isAdmin,
})(async function deleteDockerImage({ name }) {
    await execAsync(`docker rmi ${name}`)

    return {
        name,
    } as DeleteDockerImageResult
})
