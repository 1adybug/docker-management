import { getParser } from "."
import { z } from "zod/v4"

export const emailSchema = z.email({ message: "无效的邮箱" })

export type EmailParams = z.infer<typeof emailSchema>

export const emailParser = getParser(emailSchema)
