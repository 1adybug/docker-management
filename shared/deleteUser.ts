import { headers } from "next/headers"

import { prisma } from "@/prisma"

import { userIdSchema } from "@/schemas/userId"

import { auth } from "@/server/auth"
import { createRateLimit } from "@/server/createRateLimit"
import { createSharedFn } from "@/server/createSharedFn"
import { isAdmin } from "@/server/isAdmin"

import { ClientError } from "@/utils/clientError"

export const deleteUser = createSharedFn({
    name: "deleteUser",
    schema: userIdSchema,
    filter: isAdmin,
    rateLimit: createRateLimit({
        limit: 20,
        windowMs: 60_000,
        message: "删除用户操作过于频繁，请稍后再试",
    }),
})(async function deleteUser(id) {
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
})
