import { createRequestFn } from "deepsea-tools"

import { updateCurrentUserProfileAction } from "@/actions/updateCurrentUserProfile"

import { createUseUpdateCurrentUserProfile } from "@/presets/createUseUpdateCurrentUserProfile"

import { updateCurrentUserProfileSchema } from "@/schemas/updateCurrentUserProfile"

export const updateCurrentUserProfileClient = createRequestFn({
    fn: updateCurrentUserProfileAction,
    schema: updateCurrentUserProfileSchema,
})

export const useUpdateCurrentUserProfile = createUseUpdateCurrentUserProfile(updateCurrentUserProfileClient)
