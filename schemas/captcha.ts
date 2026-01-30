import { getParser } from "."
import { z } from "zod/v4"

export const captchaSchema = z
    .string({ message: "无效的验证码" })
    .trim()
    .regex(/^\d{4}$/, { message: "无效的验证码" })

export type CaptchaParams = z.infer<typeof captchaSchema>

export const captchaParser = getParser(captchaSchema)
