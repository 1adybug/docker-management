"use server"

import { createResponseFn } from "@/server/createResponseFn"

import { buildStaticDockerImage } from "@/shared/buildStaticDockerImage"

export const buildStaticDockerImageAction = createResponseFn(buildStaticDockerImage)
