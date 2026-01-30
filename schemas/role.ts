import { getParser } from "."
import { z } from "zod/v4"

export const Role = {
    管理员: "ADMIN",
    用户: "USER",
} as const

export type Role = (typeof Role)[keyof typeof Role]

export const roleSchema = z.nativeEnum(Role, { message: "无效的角色" })

export type RoleParams = z.infer<typeof roleSchema>

export const roleParser = getParser(roleSchema)
