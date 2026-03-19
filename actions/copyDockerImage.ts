"use server"

import { createResponseFn } from "@/server/createResponseFn"

import { copyDockerImage } from "@/shared/copyDockerImage"

export const copyDockerImageAction = createResponseFn(copyDockerImage)
