import { getParser } from "."
import { z } from "zod/v4"

export const nicknameSchema = z.string({ message: "无效的昵称" }).trim().min(1, { message: "昵称不能为空" }).max(24, { message: "昵称长度不能超过 24 位" })

export type NicknameParams = z.infer<typeof nicknameSchema>

export const nicknameParser = getParser(nicknameSchema)
