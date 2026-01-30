import { getParser } from "."
import { z } from "zod/v4"

export const operationLogSortBySchema = z.enum(["createdAt", "action", "ip", "userAgent", "username"], { message: "无效的排序字段" })

export type OperationLogSortByParams = z.infer<typeof operationLogSortBySchema>

export const operationLogSortByParser = getParser(operationLogSortBySchema)
