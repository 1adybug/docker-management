import { getParser } from "."
import { z } from "zod"

import { accountSchema } from "./account"
import { otpSchema } from "./otp"

export const loginSchema = z.object({
    account: accountSchema,
    otp: otpSchema,
})

export type LoginParams = z.infer<typeof loginSchema>

export const loginParser = getParser(loginSchema)
