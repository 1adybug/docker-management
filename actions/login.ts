"use server"

import { loginSchema } from "@/schemas/login"

import { createResponseFn } from "@/server/createResponseFn"

import { login } from "@/shared/login"

export const loginAction = createResponseFn({
    fn: login,
    schema: loginSchema,
    name: "login",
})
