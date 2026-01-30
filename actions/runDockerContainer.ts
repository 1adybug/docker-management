"use server"

import { runDockerContainerSchema } from "@/schemas/runDockerContainer"

import { createResponseFn } from "@/server/createResponseFn"

import { runDockerContainer } from "@/shared/runDockerContainer"

export const runDockerContainerAction = createResponseFn({
    fn: runDockerContainer,
    schema: runDockerContainerSchema,
    name: "runDockerContainer",
})
