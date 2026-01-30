import { getParser } from "."
import { z } from "zod/v4"

export const createdAfterSchema = z.date({ message: "无效的创建时间" })

export type CreatedAfterParams = z.infer<typeof createdAfterSchema>

export const createdAfterParser = getParser(createdAfterSchema)
