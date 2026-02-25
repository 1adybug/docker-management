import { getParser } from "."
import { z } from "zod/v4"

import { otpSchema } from "./otp"
import { phoneNumberSchema } from "./phoneNumber"

export const registerPhoneOtpSchema = z.object(
    {
        phoneNumber: phoneNumberSchema,
        otp: otpSchema,
    },
    { message: "无效的注册参数" },
)

export type RegisterPhoneOtpParams = z.infer<typeof registerPhoneOtpSchema>

export const registerPhoneOtpParser = getParser(registerPhoneOtpSchema)
