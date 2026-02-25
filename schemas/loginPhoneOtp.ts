import { getParser } from "."
import { z } from "zod/v4"

import { otpSchema } from "./otp"
import { phoneNumberSchema } from "./phoneNumber"

export const loginPhoneOtpSchema = z.object(
    {
        phoneNumber: phoneNumberSchema,
        code: otpSchema,
    },
    { message: "无效的登录参数" },
)

export type LoginPhoneOtpParams = z.infer<typeof loginPhoneOtpSchema>

export const loginPhoneOtpParser = getParser(loginPhoneOtpSchema)
