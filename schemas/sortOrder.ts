import { getParser } from "."
import { z } from "zod/v4"

export const sortOrderSchema = z.enum(["asc", "desc"], { message: "无效的排序方向" })

export type SortOrderParams = z.infer<typeof sortOrderSchema>

export const SortOrderParser = getParser(sortOrderSchema)
