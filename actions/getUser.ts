"use server"

import { createResponseFn } from "@/server/createResponseFn"

import { getUser } from "@/shared/getUser"

export const getUserAction = createResponseFn(getUser)
