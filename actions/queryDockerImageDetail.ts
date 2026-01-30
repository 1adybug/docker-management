"use server"

import { createResponseFn } from "@/server/createResponseFn"

import { queryDockerImageDetail } from "@/shared/queryDockerImageDetail"

export const queryDockerImageDetailAction = createResponseFn({
    fn: queryDockerImageDetail,
    name: "queryDockerImageDetail",
})
