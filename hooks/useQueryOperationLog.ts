import { createRequestFn } from "deepsea-tools"
import { createUseQuery } from "soda-tanstack-query"

import { queryOperationLogAction } from "@/actions/queryOperationLog"

export const queryOperationLogClient = createRequestFn(queryOperationLogAction)

export const useQueryOperationLog = createUseQuery({
    queryFn: queryOperationLogClient,
    queryKey: "query-operation-log",
})
