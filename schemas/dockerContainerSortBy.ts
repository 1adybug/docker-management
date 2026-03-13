import { getParser } from "."
import { z } from "zod/v4"

export const dockerContainerSortBySchema = z.enum(["name", "project"], {
    message: "无效的容器主表排序字段",
})

export type DockerContainerSortByParams = z.infer<typeof dockerContainerSortBySchema>

export const dockerContainerSortByParser = getParser(dockerContainerSortBySchema)
