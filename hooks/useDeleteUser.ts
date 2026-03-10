import { createRequestFn } from "deepsea-tools"

import { deleteUserAction } from "@/actions/deleteUser"

import { createUseDeleteUser } from "@/presets/createUseDeleteUser"

export const deleteUserClient = createRequestFn(deleteUserAction)

export const useDeleteUser = createUseDeleteUser(deleteUserClient)
