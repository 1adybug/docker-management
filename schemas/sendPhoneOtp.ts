import { getParser } from "."
import { z } from "zod/v4"

import { phoneNumberSchema } from "./phoneNumber"

export const sendPhoneOtpSchema = z.object(
    {
        phoneNumber: phoneNumberSchema,
    },
    { message: "无效的验证码参数" },
)

export type SendPhoneOtpParams = z.infer<typeof sendPhoneOtpSchema>

export const sendPhoneOtpParser = getParser(sendPhoneOtpSchema)
