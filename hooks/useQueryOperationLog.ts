import { createRequestFn } from "deepsea-tools"
import { createUseQuery } from "soda-tanstack-query"

import { queryOperationLogAction } from "@/actions/queryOperationLog"

import { queryOperationLogSchema } from "@/schemas/queryOperationLog"

export const queryOperationLogClient = createRequestFn({
    fn: queryOperationLogAction,
    schema: queryOperationLogSchema,
})

export const useQueryOperationLog = createUseQuery({
    queryFn: queryOperationLogClient,
    queryKey: "query-operation-log",
})
