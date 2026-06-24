"use server"

import { createResponseFn } from "@/server/createResponseFn"

import { exportUser } from "@/shared/exportUser"

export const exportUserAction = createResponseFn(exportUser)
