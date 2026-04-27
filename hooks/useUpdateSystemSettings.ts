import { createRequestFn } from "deepsea-tools"

import { updateSystemSettingsAction } from "@/actions/updateSystemSettings"

import { createUseUpdateSystemSettings } from "@/presets/createUseUpdateSystemSettings"

import { updateSystemSettingsSchema } from "@/schemas/updateSystemSettings"

export const updateSystemSettingsClient = createRequestFn({
    fn: updateSystemSettingsAction,
    schema: updateSystemSettingsSchema,
})

export const useUpdateSystemSettings = createUseUpdateSystemSettings(updateSystemSettingsClient)
