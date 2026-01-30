"use server"

import { createResponseFn } from "@/server/createResponseFn"

import { getUserOwn } from "@/shared/getUserOwn"

export const getUserOwnAction = createResponseFn({
    fn: getUserOwn,
    name: "getUserOwn",
})
