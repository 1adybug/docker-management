import { createRequestFn } from "deepsea-tools"
import { createUseQuery } from "soda-tanstack-query"

import { queryDockerImageDetailAction } from "@/actions/queryDockerImageDetail"

export const queryDockerImageDetailClient = createRequestFn({
    fn: queryDockerImageDetailAction,
})

export const useQueryDockerImageDetail = createUseQuery({
    queryFn: queryDockerImageDetailClient,
    queryKey: "query-docker-image-detail",
})
