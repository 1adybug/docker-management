import { getParser } from "."
import { z } from "zod/v4"

export const buildJarDockerImageSchema = z.instanceof(FormData, {
    message: "无效的 Jar 镜像参数",
})

export type BuildJarDockerImageParams = z.infer<typeof buildJarDockerImageSchema>

export const buildJarDockerImageParser = getParser(buildJarDockerImageSchema)
