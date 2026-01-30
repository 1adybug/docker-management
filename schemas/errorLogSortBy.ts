import { getParser } from "."
import { z } from "zod/v4"

export const errorLogSortBySchema = z.enum(["createdAt", "action", "ip", "userAgent", "username", "type", "message"], { message: "无效的排序字段" })

export type ErrorLogSortByParams = z.infer<typeof errorLogSortBySchema>

export const errorLogSortByParser = getParser(errorLogSortBySchema)
