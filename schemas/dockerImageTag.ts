import { getParser } from "."
import { z } from "zod/v4"

export const dockerImageTagSchema = z
    .string({ message: "无效的镜像 tag" })
    .trim()
    .min(1, { message: "镜像 tag 不能为空" })
    .max(128, { message: "镜像 tag 长度不能超过 128 位" })
    .regex(/^[a-zA-Z0-9_][a-zA-Z0-9_.-]{0,127}$/u, { message: "镜像 tag 格式无效" })

export type DockerImageTagParams = z.infer<typeof dockerImageTagSchema>

export const dockerImageTagParser = getParser(dockerImageTagSchema)
