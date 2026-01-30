import { createRequestFn } from "deepsea-tools"
import { createUseQuery } from "soda-tanstack-query"

import { queryUserAction } from "@/actions/queryUser"

import { queryUserSchema } from "@/schemas/queryUser"

export const queryUserClient = createRequestFn({
    fn: queryUserAction,
    schema: queryUserSchema,
})

export const useQueryUser = createUseQuery({
    queryFn: queryUserClient,
    queryKey: "query-user",
})
