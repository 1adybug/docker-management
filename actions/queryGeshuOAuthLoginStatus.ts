"use server"

import { createResponseFn } from "@/server/createResponseFn"

import { queryGeshuOAuthLoginStatus } from "@/shared/queryGeshuOAuthLoginStatus"

export const queryGeshuOAuthLoginStatusAction = createResponseFn(queryGeshuOAuthLoginStatus)
