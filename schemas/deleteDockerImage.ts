import { getParser } from "."
import { z } from "zod/v4"

import { dockerImageNameSchema } from "./dockerImageName"

export const deleteDockerImageSchema = z.object(
    {
        name: dockerImageNameSchema,
    },
    { message: "无效的镜像参数" },
)

export type DeleteDockerImageParams = z.infer<typeof deleteDockerImageSchema>

export const deleteDockerImageParser = getParser(deleteDockerImageSchema)
