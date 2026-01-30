import { getParser } from "."
import { z } from "zod/v4"

export const dockerImageNameSchema = z
    .string({ message: "无效的镜像名称" })
    .min(1, { message: "镜像名称不能为空" })
    .max(200, { message: "镜像名称长度不能超过 200 位" })
    .regex(/^[a-zA-Z0-9._/:@-]+$/, { message: "镜像名称格式无效" })

export type DockerImageNameParams = z.infer<typeof dockerImageNameSchema>

export const dockerImageNameParser = getParser(dockerImageNameSchema)
