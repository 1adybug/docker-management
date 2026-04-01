import { getParser } from "."
import { z } from "zod/v4"

import { dockerImageNameSchema } from "./dockerImageName"

export const pullDockerImageSchema = z.object(
    {
        name: dockerImageNameSchema,
    },
    { message: "无效的镜像拉取参数" },
)

export type PullDockerImageParams = z.infer<typeof pullDockerImageSchema>

export const pullDockerImageParser = getParser(pullDockerImageSchema)
