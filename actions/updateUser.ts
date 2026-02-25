"use server"

import { createResponseFn } from "@/server/createResponseFn"

import { updateUser } from "@/shared/updateUser"

export const updateUserAction = createResponseFn(updateUser)
