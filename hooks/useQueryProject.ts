import { createRequestFn } from "deepsea-tools"
import { createUseQuery } from "soda-tanstack-query"

import { queryProjectAction } from "@/actions/queryProject"

import { queryProjectSchema } from "@/schemas/queryProject"

export const queryProjectClient = createRequestFn({
    fn: queryProjectAction,
    schema: queryProjectSchema,
})

export const useQueryProject = createUseQuery({
    queryFn: queryProjectClient,
    queryKey: "query-project",
})
