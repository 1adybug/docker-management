import { createRequestFn } from "deepsea-tools"

import { updateUserAction } from "@/actions/updateUser"

import { createUseUpdateUser } from "@/presets/createUseUpdateUser"

export const updateUserClient = createRequestFn(updateUserAction)

export const useUpdateUser = createUseUpdateUser(updateUserClient)
