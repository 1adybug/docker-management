import { getParser } from "."
import { z } from "zod/v4"

import { emailSchema } from "./email"
import { otpSchema } from "./otp"

export const registerEmailOtpSchema = z.object(
    {
        email: emailSchema,
        otp: otpSchema,
    },
    { message: "无效的注册参数" },
)

export type RegisterEmailOtpParams = z.infer<typeof registerEmailOtpSchema>

export const registerEmailOtpParser = getParser(registerEmailOtpSchema)
