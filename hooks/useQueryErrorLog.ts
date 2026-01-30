import { createRequestFn } from "deepsea-tools"
import { createUseQuery } from "soda-tanstack-query"

import { queryErrorLogAction } from "@/actions/queryErrorLog"

import { queryErrorLogSchema } from "@/schemas/queryErrorLog"

export const queryErrorLogClient = createRequestFn({
    fn: queryErrorLogAction,
    schema: queryErrorLogSchema,
})

export const useQueryErrorLog = createUseQuery({
    queryFn: queryErrorLogClient,
    queryKey: "query-error-log",
})
