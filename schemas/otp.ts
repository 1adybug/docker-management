import { getParser } from "."
import { z } from "zod/v4"

export const otpSchema = z
    .string({ message: "无效的验证码" })
    .trim()
    .regex(/^\d{4}$/, { message: "无效的验证码" })

export type OtpParams = z.infer<typeof otpSchema>

export const otpParser = getParser(otpSchema)
