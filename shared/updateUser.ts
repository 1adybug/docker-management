import { prisma } from "@/prisma"

import { UpdateUserParams } from "@/schemas/updateUser"

import { isAdmin } from "@/server/isAdmin"

import { ClientError } from "@/utils/clientError"

export async function updateUser({ id, username, phone, role }: UpdateUserParams) {
    const user = await prisma.user.findUnique({ where: { id } })
    if (!user) throw new ClientError("用户不存在")
    const count = await prisma.user.count({ where: { username, id: { not: id } } })
    if (count > 0) throw new ClientError("用户名已存在")
    const count2 = await prisma.user.count({ where: { phone, id: { not: id } } })
    if (count2 > 0) throw new ClientError("手机号已存在")

    if (role === "USER" && user.role === "ADMIN") {
        const count = await prisma.user.count({ where: { role: "ADMIN" } })
        if (count === 1) throw new ClientError("不能将最后一个管理员降级为普通用户")
    }

    const response = await prisma.user.update({ where: { id }, data: { username, phone, role } })
    return response
}

updateUser.filter = isAdmin
