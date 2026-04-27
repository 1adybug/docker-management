"use server"

import { createResponseFn } from "@/server/createResponseFn"

import { updateSystemSettings } from "@/shared/updateSystemSettings"

export const updateSystemSettingsAction = createResponseFn(updateSystemSettings)
