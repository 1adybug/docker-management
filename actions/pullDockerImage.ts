"use server"

import { createResponseFn } from "@/server/createResponseFn"

import { pullDockerImage } from "@/shared/pullDockerImage"

export const pullDockerImageAction = createResponseFn(pullDockerImage)
