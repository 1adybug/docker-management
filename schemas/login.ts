import { getParser } from "."
import { z } from "zod/v4"

import { accountSchema } from "./account"
import { captchaSchema } from "./captcha"

export const loginSchema = z.object({
    account: accountSchema,
    captcha: captchaSchema,
})

export type LoginParams = z.infer<typeof loginSchema>

export const loginParser = getParser(loginSchema)
