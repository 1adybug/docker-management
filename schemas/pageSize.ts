import { getParser } from "."
import { z } from "zod/v4"

export const defaultPageSize = 10

export const pageSizeSchema = z
    .transform(input => Number(input))
    .pipe(z.number({ message: "无效的每页数量" }).int("每页数量必须是整数").min(1, "每页数量不能小于1").max(100, "每页数量不能大于100"))
    .catch(defaultPageSize)

export type PageSizeParams = z.infer<typeof pageSizeSchema>

export const pageSizeParser = getParser(pageSizeSchema)
