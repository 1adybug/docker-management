import { createRequestFn } from "deepsea-tools"

import { buildJarDockerImageAction } from "@/actions/buildJarDockerImage"

import { createUseBuildJarDockerImage } from "@/presets/createUseBuildJarDockerImage"

export const buildJarDockerImageClient = createRequestFn(buildJarDockerImageAction)

export const useBuildJarDockerImage = createUseBuildJarDockerImage(buildJarDockerImageClient)
