import { assignFnName } from "deepsea-tools"
import { headers } from "next/headers"

import { prisma } from "@/prisma"

import { UserIdParams, userIdSchema } from "@/schemas/userId"

import { auth } from "@/server/auth"
import { createFilter } from "@/server/createFilter"
import { createRateLimit } from "@/server/createRateLimit"
import { isAdmin } from "@/server/isAdmin"

import { ClientError } from "@/utils/clientError"

export async function deleteUser(id: UserIdParams) {
    const user = await prisma.user.findUnique({ where: { id } })
    if (!user) throw new ClientError("用户不存在")
    const count = await prisma.user.count({ where: { role: "admin" } })
    if (count === 1 && user.role === "admin") throw new ClientError("不能删除最后一个管理员")

    try {
        await auth.api.removeUser({
            body: {
                userId: id,
            },
            headers: await headers(),
        })

        return user
    } catch (error) {
        throw new ClientError({
            message: "删除用户失败",
            origin: error,
        })
    }
}

assignFnName(deleteUser, "deleteUser")

deleteUser.schema = userIdSchema

deleteUser.filter = createFilter(isAdmin)

deleteUser.rateLimit = createRateLimit({
    limit: 20,
    windowMs: 60_000,
    message: "删除用户操作过于频繁，请稍后再试",
})
