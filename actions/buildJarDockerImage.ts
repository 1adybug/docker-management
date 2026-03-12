"use server"

import { createResponseFn } from "@/server/createResponseFn"

import { buildJarDockerImage } from "@/shared/buildJarDockerImage"

export const buildJarDockerImageAction = createResponseFn(buildJarDockerImage)
