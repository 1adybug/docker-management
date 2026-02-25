"use server"

import { createResponseFn } from "@/server/createResponseFn"

import { runDockerContainer } from "@/shared/runDockerContainer"

export const runDockerContainerAction = createResponseFn(runDockerContainer)
