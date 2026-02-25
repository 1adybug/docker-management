"use server"

import { createResponseFn } from "@/server/createResponseFn"

import { queryUser } from "@/shared/queryUser"

export const queryUserAction = createResponseFn(queryUser)
