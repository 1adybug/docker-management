"use server"

import { createResponseFn } from "@/server/createResponseFn"

import { updateCurrentUserProfile } from "@/shared/updateCurrentUserProfile"

export const updateCurrentUserProfileAction = createResponseFn(updateCurrentUserProfile)
