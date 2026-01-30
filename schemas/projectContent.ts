import { getParser } from "."
import { z } from "zod/v4"

export const projectContentSchema = z
    .string({ message: "无效的项目内容" })
    .min(1, { message: "项目内容不能为空" })
    .max(1024 * 1024 * 2, { message: "项目内容不能超过 2MB" })

export type ProjectContentParams = z.infer<typeof projectContentSchema>

export const projectContentParser = getParser(projectContentSchema)
