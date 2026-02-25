import { getParser } from "."
import { z } from "zod/v4"

export const idSchema = z.uuid("无效的 id")

export type IdParams = z.infer<typeof idSchema>

export const idParser = getParser(idSchema)
