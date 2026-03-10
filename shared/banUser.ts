import { headers } from "next/headers"

import { prisma } from "@/prisma"

import { banUserSchema } from "@/schemas/banUser"

import { auth } from "@/server/auth"
import { createSharedFn } from "@/server/createSharedFn"

import { ClientError } from "@/utils/clientError"

export const banUser = createSharedFn({
    name: "banUser",
    schema: banUserSchema,
})(async function banUser(params) {
    try {
        const { user } = await auth.api.banUser({
            body: params,
            headers: await headers(),
        })

        const user2 = await prisma.user.findUniqueOrThrow({ where: { id: user.id } })
        return user2
    } catch (error) {
        throw new ClientError({
            message: "封禁失败",
            origin: error,
        })
    }
})
