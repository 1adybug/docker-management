import { createRequestFn } from "deepsea-tools"

import { buildStaticDockerImageAction } from "@/actions/buildStaticDockerImage"

import { createUseBuildStaticDockerImage } from "@/presets/createUseBuildStaticDockerImage"

export const buildStaticDockerImageClient = createRequestFn(buildStaticDockerImageAction)

export const useBuildStaticDockerImage = createUseBuildStaticDockerImage(buildStaticDockerImageClient)
