import { getParser } from "."
import { z } from "zod/v4"

import { dockerImageNameSchema } from "./dockerImageName"

export const renameDockerImageSchema = z.object(
    {
        name: dockerImageNameSchema,
        targetName: dockerImageNameSchema,
    },
    { message: "无效的镜像重命名参数" },
)

export type RenameDockerImageParams = z.infer<typeof renameDockerImageSchema>

export const renameDockerImageParser = getParser(renameDockerImageSchema)
