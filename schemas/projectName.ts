import { getParser } from "."
import { z } from "zod/v4"

export const projectNameSchema = z
    .string({ message: "无效的项目名称" })
    .min(1, { message: "项目名称不能为空" })
    .max(64, { message: "项目名称长度不能超过 64 位" })
    .regex(/^[a-zA-Z0-9_-]+$/, { message: "项目名称只能包含字母、数字、下划线和短横线" })

export type ProjectNameParams = z.infer<typeof projectNameSchema>

export const projectNameParser = getParser(projectNameSchema)
