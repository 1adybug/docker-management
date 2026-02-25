import { getParser } from "."
import { z } from "zod/v4"

export const passwordSchema = z
    .string({ message: "无效的密码" })
    .trim()
    .min(8, { message: "密码长度不能低于 8 位" })
    .max(32, { message: "密码长度不能超过 32 位" })

export type PasswordParams = z.infer<typeof passwordSchema>

export const passwordParser = getParser(passwordSchema)
