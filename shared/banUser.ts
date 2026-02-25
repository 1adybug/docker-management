import { assignFnName } from "deepsea-tools"
import { headers } from "next/headers"

import { prisma } from "@/prisma"

import { BanUserParams, banUserSchema } from "@/schemas/banUser"

import { auth } from "@/server/auth"

import { ClientError } from "@/utils/clientError"

export async function banUser(params: BanUserParams) {
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
}

assignFnName(banUser, "banUser")

banUser.schema = banUserSchema
