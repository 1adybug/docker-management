import { getParser } from "."
import { z } from "zod/v4"

export const userSortBySchema = z.enum(["name", "email", "phoneNumber", "role", "createdAt", "updatedAt", "banned"], {
    message: "无效的排序字段",
})

export type UserSortByParams = z.infer<typeof userSortBySchema>

export const userSortByParser = getParser(userSortBySchema)
