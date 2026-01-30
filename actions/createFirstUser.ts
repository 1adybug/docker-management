"use server"

import { createFirstUserSchema } from "@/schemas/createFirstUser"

import { createResponseFn } from "@/server/createResponseFn"

import { createFirstUser } from "@/shared/createFirstUser"

export const createFirstUserAction = createResponseFn({
    fn: createFirstUser,
    schema: createFirstUserSchema,
    name: "createFirstUser",
})
