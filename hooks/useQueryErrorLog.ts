import { createRequestFn } from "deepsea-tools"
import { createUseQuery } from "soda-tanstack-query"

import { queryErrorLogAction } from "@/actions/queryErrorLog"

export const queryErrorLogClient = createRequestFn(queryErrorLogAction)

export const useQueryErrorLog = createUseQuery({
    queryFn: queryErrorLogClient,
    queryKey: "query-error-log",
})
