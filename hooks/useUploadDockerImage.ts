import { createRequestFn } from "deepsea-tools"

import { uploadDockerImageAction } from "@/actions/uploadDockerImage"

import { createUseUploadDockerImage } from "@/presets/createUseUploadDockerImage"

export const uploadDockerImageClient = createRequestFn(uploadDockerImageAction)

export const useUploadDockerImage = createUseUploadDockerImage(uploadDockerImageClient)
