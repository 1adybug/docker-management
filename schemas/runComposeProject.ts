import { getParser } from "."
import { z } from "zod/v4"

import { composeFilePathsSchema } from "./composeFilePaths"
import { composeProjectCommandSchema } from "./composeProjectCommand"

export const runComposeProjectSchema = z.object(
    {
        composeFiles: composeFilePathsSchema,
        command: composeProjectCommandSchema,
    },
    { message: "无效的项目参数" },
)

export type RunComposeProjectParams = z.infer<typeof runComposeProjectSchema>

export const runComposeProjectParser = getParser(runComposeProjectSchema)
