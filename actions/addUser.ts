"use server"

import { addUserSchema } from "@/schemas/addUser"

import { createResponseFn } from "@/server/createResponseFn"

import { addUser } from "@/shared/addUser"

export const addUserAction = createResponseFn({
    fn: addUser,
    schema: addUserSchema,
    name: "addUser",
})
