"use server"

import { createResponseFn } from "@/server/createResponseFn"

import { banUser } from "@/shared/banUser"

export const banUserAction = createResponseFn(banUser)
