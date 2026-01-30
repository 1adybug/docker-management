import { prisma } from "@/prisma"
import { defaultUserSelect } from "@/prisma/getUserSelect"

import { isAdmin } from "@/server/isAdmin"

import { ClientError } from "@/utils/clientError"

export async function deleteUser(id: string) {
    const user = await prisma.user.findUnique({ where: { id } })
    if (!user) throw new ClientError("用户不存在")
    const count = await prisma.user.count({ where: { role: "ADMIN" } })
    if (count === 1 && user.role === "ADMIN") throw new ClientError("不能删除最后一个管理员")

    const user2 = await prisma.$transaction(async ctx => {
        const user = await ctx.user.delete({ where: { id }, select: defaultUserSelect })
        return user
    })

    return user2
}

deleteUser.filter = isAdmin
