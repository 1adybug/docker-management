import { prisma } from "@/prisma"

import { addUserSchema } from "@/schemas/addUser"

import { auth } from "@/server/auth"
import { createSharedFn } from "@/server/createSharedFn"
import { getRandomPassword } from "@/server/getRandomPassword"
import { getTempEmail } from "@/server/getTempEmail"
import { isAdmin } from "@/server/isAdmin"

import { ClientError } from "@/utils/clientError"

export const addUser = createSharedFn({
    name: "addUser",
    schema: addUserSchema,
    filter: isAdmin,
})(async function addUser({ name, nickname, phoneNumber, role }) {
    const phoneNumberCount = await prisma.user.count({ where: { phoneNumber } })
    if (phoneNumberCount > 0) throw new ClientError("手机号已被注册")

    const email = getTempEmail(phoneNumber)
    const emailCount = await prisma.user.count({ where: { email: email } })
    if (emailCount > 0) throw new ClientError("邮箱已被注册")

    try {
        const { user } = await auth.api.createUser({
            body: {
                name,
                email,
                password: getRandomPassword(),
                role,
                data: {
                    nickname,
                    phoneNumber,
                },
            },
        })

        const user2 = await prisma.user.findUniqueOrThrow({ where: { id: user.id } })
        return user2
    } catch (error) {
        throw new ClientError({
            message: "新增用户失败",
            origin: error,
        })
    }
})
