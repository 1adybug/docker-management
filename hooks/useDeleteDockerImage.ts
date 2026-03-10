import { createRequestFn } from "deepsea-tools"

import { deleteDockerImageAction } from "@/actions/deleteDockerImage"

import { createUseDeleteDockerImage } from "@/presets/createUseDeleteDockerImage"

export const deleteDockerImageClient = createRequestFn(deleteDockerImageAction)

export const useDeleteDockerImage = createUseDeleteDockerImage(deleteDockerImageClient)
