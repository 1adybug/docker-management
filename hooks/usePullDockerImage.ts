import { createRequestFn } from "deepsea-tools"

import { pullDockerImageAction } from "@/actions/pullDockerImage"

import { createUsePullDockerImage } from "@/presets/createUsePullDockerImage"

export const pullDockerImageClient = createRequestFn(pullDockerImageAction)

export const usePullDockerImage = createUsePullDockerImage(pullDockerImageClient)
