import { createRequestFn } from "deepsea-tools"
import { createUseQuery } from "soda-tanstack-query"

import { queryProjectAction } from "@/actions/queryProject"

export const queryProjectClient = createRequestFn({
    fn: queryProjectAction,
})

export const useQueryProject = createUseQuery({
    queryFn: queryProjectClient,
    queryKey: "query-project",
})
