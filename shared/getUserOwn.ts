import { prisma } from "@/prisma"

import { getCurrentUserId } from "@/server/getCurrentUserId"

import { ClientError } from "@/utils/clientError"

export async function getUserOwn() {
    const id = await getCurrentUserId()
    const user = await prisma.user.findUnique({
        where: { id },
    })
    if (!user) throw new ClientError({ message: "用户不存在", code: 404 })
    return user
}
