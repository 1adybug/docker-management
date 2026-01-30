import { getParser } from "."
import { z } from "zod/v4"

export const userSortBySchema = z.enum(["username", "phone", "role", "createdAt", "updatedAt"], {
    message: "无效的排序字段",
})

export type UserSortByParams = z.infer<typeof userSortBySchema>

export const userSortByParser = getParser(userSortBySchema)
