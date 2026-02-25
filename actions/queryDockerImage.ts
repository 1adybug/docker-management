"use server"

import { createResponseFn } from "@/server/createResponseFn"

import { queryDockerImage } from "@/shared/queryDockerImage"

export const queryDockerImageAction = createResponseFn(queryDockerImage)
