import { getParser } from "."
import { z } from "zod/v4"

import { projectNameSchema } from "./projectName"

export const deleteProjectSchema = z.object(
    {
        name: projectNameSchema,
        cleanup: z.boolean({ message: "无效的清理参数" }).optional(),
    },
    { message: "无效的项目参数" },
)

export type DeleteProjectParams = z.infer<typeof deleteProjectSchema>

export const deleteProjectParser = getParser(deleteProjectSchema)
