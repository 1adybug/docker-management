import { getParser } from "."
import { z } from "zod/v4"

export const updatedAfterSchema = z.date({ message: "无效的更新时间" })

export type UpdatedAfterParams = z.infer<typeof updatedAfterSchema>

export const updatedAfterParser = getParser(updatedAfterSchema)
