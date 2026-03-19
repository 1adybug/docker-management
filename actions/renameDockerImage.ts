"use server"

import { createResponseFn } from "@/server/createResponseFn"

import { renameDockerImage } from "@/shared/renameDockerImage"

export const renameDockerImageAction = createResponseFn(renameDockerImage)
