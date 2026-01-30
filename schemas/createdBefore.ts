import { getParser } from "."
import { z } from "zod/v4"

export const createdBeforeSchema = z.date({ message: "无效的创建时间" })

export type CreatedBeforeParams = z.infer<typeof createdBeforeSchema>

export const createdBeforeParser = getParser(createdBeforeSchema)
