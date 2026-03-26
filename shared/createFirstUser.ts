import { prisma } from "@/prisma"

import { createFirstUserSchema } from "@/schemas/createFirstUser"
import { UserRole } from "@/schemas/userRole"

import { auth } from "@/server/auth"
import { createRateLimit, RateLimitContext } from "@/server/createRateLimit"
import { createSharedFn } from "@/server/createSharedFn"
import { getRandomPassword } from "@/server/getRandomPassword"
import { getTempEmail } from "@/server/getTempEmail"

import { ClientError } from "@/utils/clientError"

function getCreateFirstUserRateLimitKey(context: RateLimitContext) {
    const ip = context.ip || "unknown-ip"
    return `create-first-user:${ip}`
}

export const createFirstUser = createSharedFn({
    name: "createFirstUser",
    schema: createFirstUserSchema,
    filter: false,
    rateLimit: createRateLimit({
        limit: 2,
        windowMs: 300_000,
        message: "初始化尝试过于频繁，请稍后再试",
        getKey: getCreateFirstUserRateLimitKey,
    }),
})(async function createFirstUser({ name, nickname, phoneNumber }) {
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
                    nickname,
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
})
