"use server"

import { createResponseFn } from "@/server/createResponseFn"

import { createFirstUser } from "@/shared/createFirstUser"

export const createFirstUserAction = createResponseFn(createFirstUser)
