import { getParser } from "."
import { z } from "zod/v4"

export const phoneNumberRegex = /^1[3-9]\d{9}$/

export const phoneNumberSchema = z.string({ message: "无效的手机号" }).trim().regex(phoneNumberRegex, { message: "无效的手机号" })

export type PhoneNumberParams = z.infer<typeof phoneNumberSchema>

export const phoneNumberParser = getParser(phoneNumberSchema)
