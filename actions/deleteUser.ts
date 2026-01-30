"use server"

import { createResponseFn } from "@/server/createResponseFn"

import { deleteUser } from "@/shared/deleteUser"

export const deleteUserAction = createResponseFn({
    fn: deleteUser,
    name: "deleteUser",
})
