"use server"

import { queryErrorLogSchema } from "@/schemas/queryErrorLog"

import { createResponseFn } from "@/server/createResponseFn"

import { queryErrorLog } from "@/shared/queryErrorLog"

export const queryErrorLogAction = createResponseFn({
    fn: queryErrorLog,
    schema: queryErrorLogSchema,
    name: "queryErrorLog",
})
