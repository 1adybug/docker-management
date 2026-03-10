import { createRequestFn } from "deepsea-tools"

import { addUserAction } from "@/actions/addUser"

import { createUseAddUser } from "@/presets/createUseAddUser"

export const addUserClient = createRequestFn(addUserAction)

export const useAddUser = createUseAddUser(addUserClient)
