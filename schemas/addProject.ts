import { getParser } from "."
import { z } from "zod/v4"

import { projectContentSchema } from "./projectContent"
import { projectNameSchema } from "./projectName"

export const addProjectSchema = z.object(
    {
        name: projectNameSchema,
        content: projectContentSchema.optional(),
    },
    { message: "无效的项目参数" },
)

export type AddProjectParams = z.infer<typeof addProjectSchema>

export const addProjectParser = getParser(addProjectSchema)
