import { createRequestFn, isNonNullable } from "deepsea-tools"
import { createUseQuery } from "soda-tanstack-query"

import { getUserAction } from "@/actions/getUser"

import { UserIdParams, userIdSchema } from "@/schemas/userId"

export const getUserClient = createRequestFn({
    fn: getUserAction,
    schema: userIdSchema,
})

export function getUserClientOptional(id?: UserIdParams | undefined) {
    return isNonNullable(id) ? getUserClient(id) : null
}

export const useGetUser = createUseQuery({
    queryFn: getUserClientOptional,
    queryKey: "get-user",
})
