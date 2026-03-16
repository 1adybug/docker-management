import { getParser } from "."
import { z } from "zod/v4"

import { composeFilePathsSchema } from "./composeFilePaths"

export const readComposeProjectSchema = z.object(
    {
        composeFiles: composeFilePathsSchema,
    },
    { message: "无效的 compose 项目参数" },
)

export type ReadComposeProjectParams = z.infer<typeof readComposeProjectSchema>

export const readComposeProjectParser = getParser(readComposeProjectSchema)
