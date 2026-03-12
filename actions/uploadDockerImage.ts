"use server"

import { createResponseFn } from "@/server/createResponseFn"

import { uploadDockerImage } from "@/shared/uploadDockerImage"

export const uploadDockerImageAction = createResponseFn(uploadDockerImage)
