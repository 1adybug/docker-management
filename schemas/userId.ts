import { getParser } from "."
import { z } from "zod"

export const userIdSchema = z.string({ message: "无效的用户 id" }).regex(/^[0-9a-z]{32}$/i, "无效的用户 id")

export type UserIdParams = z.infer<typeof userIdSchema>

export const userIdParser = getParser(userIdSchema)
