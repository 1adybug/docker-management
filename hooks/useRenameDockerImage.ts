import { createRequestFn } from "deepsea-tools"

import { renameDockerImageAction } from "@/actions/renameDockerImage"

import { createUseRenameDockerImage } from "@/presets/createUseRenameDockerImage"

export const renameDockerImageClient = createRequestFn(renameDockerImageAction)

export const useRenameDockerImage = createUseRenameDockerImage(renameDockerImageClient)
