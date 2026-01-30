"use server"

import { accountSchema } from "@/schemas/account"

import { createResponseFn } from "@/server/createResponseFn"

import { sendCaptcha } from "@/shared/sendCaptcha"

export const sendCaptchaAction = createResponseFn({
    fn: sendCaptcha,
    schema: accountSchema,
    name: "sendCaptcha",
})
