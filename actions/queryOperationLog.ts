"use server"

import { createResponseFn } from "@/server/createResponseFn"

import { queryOperationLog } from "@/shared/queryOperationLog"

export const queryOperationLogAction = createResponseFn(queryOperationLog)
