import type { User } from "@/prisma/generated/client"

import { UserRole } from "@/schemas/userRole"

export function isAdmin(user: Pick<User, "role">) {
    return user.role === UserRole.管理员
}
