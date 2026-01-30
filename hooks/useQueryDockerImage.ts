import { createRequestFn } from "deepsea-tools"
import { createUseQuery } from "soda-tanstack-query"

import { queryDockerImageAction } from "@/actions/queryDockerImage"

export const queryDockerImageClient = createRequestFn({
    fn: queryDockerImageAction,
})

export const useQueryDockerImage = createUseQuery({
    queryFn: queryDockerImageClient,
    queryKey: "query-docker-image",
})
