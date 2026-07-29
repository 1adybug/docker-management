"use server"

import { createResponseFn } from "@/server/createResponseFn"

import { queryGeshuAgentOAuthLoginStatus } from "@/shared/queryGeshuAgentOAuthLoginStatus"

export const queryGeshuAgentOAuthLoginStatusAction = createResponseFn(queryGeshuAgentOAuthLoginStatus)
