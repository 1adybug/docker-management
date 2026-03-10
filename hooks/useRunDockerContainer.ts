import { createRequestFn } from "deepsea-tools"

import { runDockerContainerAction } from "@/actions/runDockerContainer"

import { createUseRunDockerContainer } from "@/presets/createUseRunDockerContainer"

export const runDockerContainerClient = createRequestFn(runDockerContainerAction)

export const useRunDockerContainer = createUseRunDockerContainer(runDockerContainerClient)
