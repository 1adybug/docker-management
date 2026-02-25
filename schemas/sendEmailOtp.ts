import { getParser } from "."
import { z } from "zod/v4"

import { emailSchema } from "./email"

export const sendEmailOtpSchema = z.object(
    {
        email: emailSchema,
    },
    { message: "无效的验证码参数" },
)

export type SendEmailOtpParams = z.infer<typeof sendEmailOtpSchema>

export const sendEmailOtpParser = getParser(sendEmailOtpSchema)
