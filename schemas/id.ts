import { getParser } from "."
import { z } from "zod/v4"

export const idSchema = z.string({ message: "无效的 id" }).uuid("无效的 id")

export type IdParams = z.infer<typeof idSchema>

export const idParser = getParser(idSchema)
