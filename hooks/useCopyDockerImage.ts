import { createRequestFn } from "deepsea-tools"

import { copyDockerImageAction } from "@/actions/copyDockerImage"

import { createUseCopyDockerImage } from "@/presets/createUseCopyDockerImage"

export const copyDockerImageClient = createRequestFn(copyDockerImageAction)

export const useCopyDockerImage = createUseCopyDockerImage(copyDockerImageClient)
