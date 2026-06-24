"use server"

import { createResponseFn } from "@/server/createResponseFn"

import { importUser } from "@/shared/importUser"

export const importUserAction = createResponseFn(importUser)
