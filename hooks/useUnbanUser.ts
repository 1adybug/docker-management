import { createRequestFn } from "deepsea-tools"

import { unbanUserAction } from "@/actions/unbanUser"

import { createUseUnbanUser } from "@/presets/createUseUnbanUser"

export const unbanUserClient = createRequestFn(unbanUserAction)

export const useUnbanUser = createUseUnbanUser(unbanUserClient)
