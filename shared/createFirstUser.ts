import { assignFnName } from "deepsea-tools"

import { prisma } from "@/prisma"

import { CreateFirstUserParams, createFirstUserSchema } from "@/schemas/createFirstUser"
import { UserRole } from "@/schemas/userRole"

import { auth } from "@/server/auth"
import { createFilter } from "@/server/createFilter"
import { createRateLimit, RateLimitContext } from "@/server/createRateLimit"
import { getRandomPassword } from "@/server/getRandomPassword"
import { getTempEmail } from "@/server/getTempEmail"

import { ClientError } from "@/utils/clientError"

function getCreateFirstUserRateLimitKey(context: RateLimitContext) {
    const ip = context.ip || "unknown-ip"
    return `create-first-user:${ip}`
}

export async function createFirstUser({ name, phoneNumber }: CreateFirstUserParams) {
    const count = await prisma.user.count()
    if (count > 0) throw new ClientError("禁止操作")

    try {
        const { user } = await auth.api.createUser({
            body: {
                name,
                email: getTempEmail(phoneNumber),
                password: getRandomPassword(),
                role: UserRole.管理员,
                data: {
                    phoneNumber,
                },
            },
        })

        const user2 = await prisma.user.findUniqueOrThrow({ where: { id: user.id } })

        return user2
    } catch (error) {
        throw new ClientError({
            message: "初始化失败",
            origin: error,
        })
    }
}

assignFnName(createFirstUser, "createFirstUser")

createFirstUser.schema = createFirstUserSchema

createFirstUser.filter = createFilter(false)

createFirstUser.rateLimit = createRateLimit({
    limit: 2,
    windowMs: 300_000,
    message: "初始化尝试过于频繁，请稍后再试",
    getKey: getCreateFirstUserRateLimitKey,
})
