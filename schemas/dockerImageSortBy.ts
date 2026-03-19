import { getParser } from "."
import { z } from "zod/v4"

export const dockerImageSortBySchema = z.enum(["repository", "tag", "id", "size", "createdAt", "projects", "containerItems"], {
    message: "无效的镜像排序字段",
})

export type DockerImageSortByParams = z.infer<typeof dockerImageSortBySchema>

export const dockerImageSortByParser = getParser(dockerImageSortBySchema)
