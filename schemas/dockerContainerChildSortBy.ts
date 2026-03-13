import { getParser } from "."
import { z } from "zod/v4"

export const dockerContainerChildSortBySchema = z.enum(["name", "id", "image", "status", "createdAt"], {
    message: "无效的容器子表排序字段",
})

export type DockerContainerChildSortByParams = z.infer<typeof dockerContainerChildSortBySchema>

export const dockerContainerChildSortByParser = getParser(dockerContainerChildSortBySchema)
