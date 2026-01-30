import { getParser } from "."
import { z } from "zod/v4"

export const dockerContainerIdSchema = z
    .string({ message: "无效的容器 ID" })
    .min(1, { message: "容器 ID 不能为空" })
    .max(200, { message: "容器 ID 长度不能超过 200 位" })

export type DockerContainerIdParams = z.infer<typeof dockerContainerIdSchema>

export const dockerContainerIdParser = getParser(dockerContainerIdSchema)
