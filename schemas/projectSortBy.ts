import { getParser } from "."
import { z } from "zod/v4"

export const projectSortBySchema = z.enum(["xName", "name", "createdAt", "updatedAt"], {
    message: "无效的项目排序字段",
})

export type ProjectSortByParams = z.infer<typeof projectSortBySchema>

export const projectSortByParser = getParser(projectSortBySchema)
