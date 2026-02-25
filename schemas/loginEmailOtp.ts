import { getParser } from "."
import { z } from "zod/v4"

import { emailSchema } from "./email"
import { otpSchema } from "./otp"

export const loginEmailOtpSchema = z.object(
    {
        email: emailSchema,
        otp: otpSchema,
    },
    { message: "无效的登录参数" },
)

export type LoginEmailOtpParams = z.infer<typeof loginEmailOtpSchema>

export const loginEmailOtpParser = getParser(loginEmailOtpSchema)
