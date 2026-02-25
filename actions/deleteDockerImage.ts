"use server"

import { createResponseFn } from "@/server/createResponseFn"

import { deleteDockerImage } from "@/shared/deleteDockerImage"

export const deleteDockerImageAction = createResponseFn(deleteDockerImage)
