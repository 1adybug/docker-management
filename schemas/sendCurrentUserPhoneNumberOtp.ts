import { getParser } from "."
import { z } from "zod/v4"

import { phoneNumberSchema } from "./phoneNumber"

export const sendCurrentUserPhoneNumberOtpSchema = z.object(
    {
        phoneNumber: phoneNumberSchema,
    },
    { message: "无效的手机号验证码参数" },
)

export type SendCurrentUserPhoneNumberOtpParams = z.infer<typeof sendCurrentUserPhoneNumberOtpSchema>

export const sendCurrentUserPhoneNumberOtpParser = getParser(sendCurrentUserPhoneNumberOtpSchema)
