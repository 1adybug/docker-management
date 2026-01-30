import { User } from "@/prisma/generated/client"

import { Role } from "@/schemas/role"

export function isAdmin(user: User) {
    return user.role === Role.管理员
}
