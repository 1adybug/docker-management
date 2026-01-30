import { getParser } from "."
import { z } from "zod/v4"

import { projectNameSchema } from "./projectName"

export const getProjectSchema = z.object(
    {
        name: projectNameSchema,
    },
    { message: "无效的项目参数" },
)

export type GetProjectParams = z.infer<typeof getProjectSchema>

export const getProjectParser = getParser(getProjectSchema)
