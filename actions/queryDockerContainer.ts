"use server"

import { createResponseFn } from "@/server/createResponseFn"

import { queryDockerContainer } from "@/shared/queryDockerContainer"

export const queryDockerContainerAction = createResponseFn({
    fn: queryDockerContainer,
    name: "queryDockerContainer",
})
