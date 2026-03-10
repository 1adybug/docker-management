import { headers } from "next/headers"

import { prisma } from "@/prisma"

import { updateUserSchema } from "@/schemas/updateUser"
import { UserRole } from "@/schemas/userRole"

import { auth } from "@/server/auth"
import { createRateLimit } from "@/server/createRateLimit"
import { createSharedFn } from "@/server/createSharedFn"
import { isAdmin } from "@/server/isAdmin"

import { ClientError } from "@/utils/clientError"

export const updateUser = createSharedFn({
    name: "updateUser",
    schema: updateUserSchema,
    filter: isAdmin,
    rateLimit: createRateLimit({
        limit: 30,
        windowMs: 60_000,
        message: "更新用户操作过于频繁，请稍后再试",
    }),
})(async function updateUser({ id, name, phoneNumber, role }) {
    const user = await prisma.user.findUnique({ where: { id } })
    if (!user) throw new ClientError("用户不存在")

    const phoneNumberCount = await prisma.user.count({ where: { phoneNumber: phoneNumber, id: { not: id } } })
    if (phoneNumberCount > 0) throw new ClientError("手机号已存在")

    if (role === UserRole.用户 && user.role === UserRole.管理员) {
        const adminCount = await prisma.user.count({ where: { role: UserRole.管理员 } })
        if (adminCount === 1) throw new ClientError("不能将最后一个管理员降级为普通用户")
    }

    try {
        await auth.api.adminUpdateUser({
            body: {
                userId: id,
                data: {
                    name,
                    phoneNumber,
                    role,
                },
            },
            headers: await headers(),
        })

        const user3 = await prisma.user.findUniqueOrThrow({ where: { id } })
        return user3
    } catch (error) {
        throw new ClientError({
            message: "更新用户失败",
            origin: error,
        })
    }
})
