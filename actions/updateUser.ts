"use server"

import { updateUserSchema } from "@/schemas/updateUser"

import { createResponseFn } from "@/server/createResponseFn"

import { updateUser } from "@/shared/updateUser"

export const updateUserAction = createResponseFn({
    fn: updateUser,
    schema: updateUserSchema,
    name: "updateUser",
})
