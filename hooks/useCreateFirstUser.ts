import { createRequestFn } from "deepsea-tools"

import { createFirstUserAction } from "@/actions/createFirstUser"

import { createUseCreateFirstUser } from "@/presets/createUseCreateFirstUser"

export const createFirstUserClient = createRequestFn(createFirstUserAction)

export const useCreateFirstUser = createUseCreateFirstUser(createFirstUserClient)
