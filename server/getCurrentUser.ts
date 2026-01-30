import { prisma } from "@/prisma"

import { getCurrentUserId } from "./getCurrentUserId"

export async function getCurrentUser() {
    const id = await getCurrentUserId()
    if (!id) return undefined
    const user = await prisma.user.findUnique({ where: { id } })
    return user || undefined
}
