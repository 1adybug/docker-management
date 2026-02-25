"use server"

import { createResponseFn } from "@/server/createResponseFn"

import { queryErrorLog } from "@/shared/queryErrorLog"

export const queryErrorLogAction = createResponseFn(queryErrorLog)
