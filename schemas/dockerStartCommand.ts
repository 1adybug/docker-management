import { getParser } from "."
import { z } from "zod/v4"

export const dockerStartCommandSchema = z
    .string({ message: "无效的启动命令" })
    .trim()
    .min(1, { message: "启动命令不能为空" })
    .max(500, { message: "启动命令长度不能超过 500 位" })
    .refine(value => !value.includes("\r") && !value.includes("\n"), {
        message: "启动命令不能包含换行",
    })

export type DockerStartCommandParams = z.infer<typeof dockerStartCommandSchema>

export const dockerStartCommandParser = getParser(dockerStartCommandSchema)
