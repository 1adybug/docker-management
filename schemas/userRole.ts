import { getParser } from "."
import { z } from "zod/v4"

export const UserRole = {
    管理员: "admin",
    用户: "user",
} as const

export type UserRole = (typeof UserRole)[keyof typeof UserRole]

export const UserRoleSchema = z.enum(UserRole, { message: "无效的角色" })

export type UserRoleParams = z.infer<typeof UserRoleSchema>

export const UserRoleParser = getParser(UserRoleSchema)
