"use server"

import { deleteDockerImageSchema } from "@/schemas/deleteDockerImage"

import { createResponseFn } from "@/server/createResponseFn"

import { deleteDockerImage } from "@/shared/deleteDockerImage"

export const deleteDockerImageAction = createResponseFn({
    fn: deleteDockerImage,
    schema: deleteDockerImageSchema,
    name: "deleteDockerImage",
})
