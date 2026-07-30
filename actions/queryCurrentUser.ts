"use server"

import { createResponseFn } from "@/server/createResponseFn"

import { queryCurrentUser } from "@/shared/queryCurrentUser"

export const queryCurrentUserAction = createResponseFn(queryCurrentUser)
