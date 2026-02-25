"use server"

import { createResponseFn } from "@/server/createResponseFn"

import { unbanUser } from "@/shared/unbanUser"

export const unbanUserAction = createResponseFn(unbanUser)
