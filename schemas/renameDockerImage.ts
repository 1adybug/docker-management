import { getParser } from "."
import { z } from "zod/v4"

import { dockerImageNameSchema } from "./dockerImageName"
import { dockerImageTagSchema } from "./dockerImageTag"

export const renameDockerImageSchema = z.object(
    {
        name: dockerImageNameSchema,
        tag: dockerImageTagSchema,
    },
    { message: "无效的镜像重命名参数" },
)

export type RenameDockerImageParams = z.infer<typeof renameDockerImageSchema>

export const renameDockerImageParser = getParser(renameDockerImageSchema)
