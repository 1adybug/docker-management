import { getParser } from "."
import { z } from "zod/v4"

import { projectCommandSchema } from "./projectCommand"
import { projectNameSchema } from "./projectName"
import { projectStartMountOptionsSchema } from "./projectStartMountOptions"

export const runProjectSchema = z.object(
    {
        name: projectNameSchema,
        command: projectCommandSchema,
        mountPathOptions: projectStartMountOptionsSchema.optional(),
    },
    { message: "无效的项目参数" },
)

export type RunProjectParams = z.infer<typeof runProjectSchema>

export const runProjectParser = getParser(runProjectSchema)
