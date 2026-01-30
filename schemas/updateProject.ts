import { getParser } from "."
import { z } from "zod/v4"

import { projectContentSchema } from "./projectContent"
import { projectNameSchema } from "./projectName"

export const updateProjectSchema = z.object(
    {
        name: projectNameSchema,
        content: projectContentSchema,
    },
    { message: "无效的项目参数" },
)

export type UpdateProjectParams = z.infer<typeof updateProjectSchema>

export const updateProjectParser = getParser(updateProjectSchema)
