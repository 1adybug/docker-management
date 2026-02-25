import { User } from "@/prisma/generated/client"

import { UserRole } from "@/schemas/userRole"

export function isAdmin(user: User) {
    return user.role === UserRole.管理员
}
