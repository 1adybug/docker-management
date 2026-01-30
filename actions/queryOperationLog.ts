"use server"

import { queryOperationLogSchema } from "@/schemas/queryOperationLog"

import { createResponseFn } from "@/server/createResponseFn"

import { queryOperationLog } from "@/shared/queryOperationLog"

export const queryOperationLogAction = createResponseFn({
    fn: queryOperationLog,
    schema: queryOperationLogSchema,
    name: "queryOperationLog",
})
