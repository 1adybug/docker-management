import { getParser } from "."
import { z } from "zod/v4"

export const uploadDockerImageSchema = z.instanceof(FormData, {
    message: "无效的上传参数",
})

export const uploadDockerImageParser = getParser(uploadDockerImageSchema)
