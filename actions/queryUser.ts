"use server"

import { queryUserSchema } from "@/schemas/queryUser"

import { createResponseFn } from "@/server/createResponseFn"

import { queryUser } from "@/shared/queryUser"

export const queryUserAction = createResponseFn({
    fn: queryUser,
    schema: queryUserSchema,
    name: "queryUser",
})
