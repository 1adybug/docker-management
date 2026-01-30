import { execAsync } from "soda-nodejs"

import { DeleteDockerImageParams } from "@/schemas/deleteDockerImage"

import { isAdmin } from "@/server/isAdmin"

export interface DeleteDockerImageResult {
    name: string
}

export async function deleteDockerImage({ name }: DeleteDockerImageParams) {
    await execAsync(`docker rmi ${name}`)

    return {
        name,
    } as DeleteDockerImageResult
}

deleteDockerImage.filter = isAdmin
