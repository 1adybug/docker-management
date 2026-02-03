import { getParser } from "."
import { z } from "zod/v4"

export const composeFilePathsSchema = z
    .array(z.string({ message: "无效的 compose 文件" }).min(1, { message: "无效的 compose 文件" }))
    .min(1, { message: "无效的 compose 文件" })

export type ComposeFilePathsParams = z.infer<typeof composeFilePathsSchema>

export const composeFilePathsParser = getParser(composeFilePathsSchema)
