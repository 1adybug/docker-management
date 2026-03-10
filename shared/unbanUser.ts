import { headers } from "next/headers"

import { prisma } from "@/prisma"

import { userIdSchema } from "@/schemas/userId"

import { auth } from "@/server/auth"
import { createSharedFn } from "@/server/createSharedFn"

import { ClientError } from "@/utils/clientError"

export const unbanUser = createSharedFn({
    name: "unbanUser",
    schema: userIdSchema,
})(async function unbanUser(userId) {
    try {
        const { user } = await auth.api.unbanUser({
            body: { userId },
            headers: await headers(),
        })

        const user2 = await prisma.user.findUniqueOrThrow({ where: { id: user.id } })
        return user2
    } catch (error) {
        throw new ClientError({
            message: "解封失败",
            origin: error,
        })
    }
})
