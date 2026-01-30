import { prisma } from "@/prisma"

import { AddUserParams } from "@/schemas/addUser"

import { isAdmin } from "@/server/isAdmin"

import { ClientError } from "@/utils/clientError"

export async function addUser({ username, phone, role }: AddUserParams) {
    const count = await prisma.user.count({ where: { username } })
    if (count > 0) throw new ClientError("用户名已存在")
    const count2 = await prisma.user.count({ where: { phone } })
    if (count2 > 0) throw new ClientError("手机号已存在")
    const user = await prisma.user.create({ data: { username, phone, role } })
    return user
}

addUser.filter = isAdmin
