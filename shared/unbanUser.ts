import { assignFnName } from "deepsea-tools"
import { headers } from "next/headers"

import { prisma } from "@/prisma"

import { UserIdParams, userIdSchema } from "@/schemas/userId"

import { auth } from "@/server/auth"

import { ClientError } from "@/utils/clientError"

export async function unbanUser(userId: UserIdParams) {
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
}

assignFnName(unbanUser, "unbanUser")

unbanUser.schema = userIdSchema
