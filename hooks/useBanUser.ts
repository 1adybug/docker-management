import { createRequestFn } from "deepsea-tools"

import { banUserAction } from "@/actions/banUser"

import { createUseBanUser } from "@/presets/createUseBanUser"

export const banUserClient = createRequestFn(banUserAction)

export const useBanUser = createUseBanUser(banUserClient)
