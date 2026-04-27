"use server"

import { createResponseFn } from "@/server/createResponseFn"

import { querySystemSettings } from "@/shared/querySystemSettings"

export const querySystemSettingsAction = createResponseFn(querySystemSettings)
