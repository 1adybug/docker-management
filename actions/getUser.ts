"use server"

import { idSchema } from "@/schemas/id"

import { createResponseFn } from "@/server/createResponseFn"

import { getUser } from "@/shared/getUser"

export const getUserAction = createResponseFn({
    fn: getUser,
    schema: idSchema,
    name: "getUser",
})
