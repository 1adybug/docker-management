import { getParser } from "."
import { z } from "zod/v4"

import { dockerImageNameSchema } from "./dockerImageName"
import { dockerImageTagSchema } from "./dockerImageTag"

export const copyDockerImageSchema = z.object(
    {
        name: dockerImageNameSchema,
        tag: dockerImageTagSchema,
    },
    { message: "无效的镜像复制参数" },
)

export type CopyDockerImageParams = z.infer<typeof copyDockerImageSchema>

export const copyDockerImageParser = getParser(copyDockerImageSchema)
