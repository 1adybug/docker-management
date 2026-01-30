import { createRequestFn, isNonNullable } from "deepsea-tools"
import { createUseQuery } from "soda-tanstack-query"

import { getUserAction } from "@/actions/getUser"

import { IdParams, idSchema } from "@/schemas/id"

export const getUserClient = createRequestFn({
    fn: getUserAction,
    schema: idSchema,
})

export function getUserClientOptional(id?: IdParams | undefined) {
    return isNonNullable(id) ? getUserClient(id) : null
}

export const useGetUser = createUseQuery({
    queryFn: getUserClientOptional,
    queryKey: "get-user",
})
