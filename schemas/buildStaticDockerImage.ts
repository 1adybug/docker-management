import { getParser } from "."
import { z } from "zod/v4"

export const buildStaticDockerImageSchema = z.instanceof(FormData, {
    message: "无效的静态镜像参数",
})

export type BuildStaticDockerImageParams = z.infer<typeof buildStaticDockerImageSchema>

export const buildStaticDockerImageParser = getParser(buildStaticDockerImageSchema)
