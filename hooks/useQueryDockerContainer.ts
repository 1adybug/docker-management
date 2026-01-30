import { createRequestFn } from "deepsea-tools"
import { createUseQuery } from "soda-tanstack-query"

import { queryDockerContainerAction } from "@/actions/queryDockerContainer"

export const queryDockerContainerClient = createRequestFn({
    fn: queryDockerContainerAction,
})

export const useQueryDockerContainer = createUseQuery({
    queryFn: queryDockerContainerClient,
    queryKey: "query-docker-container",
})
