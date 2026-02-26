import { createRequestFn } from "deepsea-tools"
import { createUseQuery } from "soda-tanstack-query"

import { queryUserAction } from "@/actions/queryUser"

export const queryUserClient = createRequestFn(queryUserAction)

export const useQueryUser = createUseQuery({
    queryFn: queryUserClient,
    queryKey: "query-user",
})
