import { getParser } from "."
import { z } from "zod/v4"

export const importUserSchema = z.instanceof(FormData, { message: "无效的导入参数" }).refine(formData => formData.get("file") instanceof File, {
    message: "请选择 xlsx 文件",
})

export type ImportUserParams = z.infer<typeof importUserSchema>

export const importUserParser = getParser(importUserSchema)
