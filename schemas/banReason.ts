import { getParser } from "."
import { z } from "zod"

export const banReasonSchema = z.string("无效的封禁原因").max(256, "封禁原因不能超过256个字符")

export type BanReasonParams = z.infer<typeof banReasonSchema>

export const banReasonParser = getParser(banReasonSchema)
