import { GeshuAgentOAuthProviderId } from "@/constants"

import { prisma } from "@/prisma"

import { createSharedFn } from "@/server/createSharedFn"
import { getCurrentUser } from "@/server/getCurrentUser"

import { ClientError } from "@/utils/clientError"

export interface QueryCurrentUserResult {
    id: string
    name: string
    nickname: string
    phoneNumber: string
    role: string
    geshuAgentLinked: boolean
}

export const queryCurrentUser = createSharedFn<never, "query-current-user">({
    name: "queryCurrentUser",
    route: {
        pathname: "query-current-user",
    },
})(async function queryCurrentUser(): Promise<QueryCurrentUserResult> {
    const user = await getCurrentUser()
    if (!user) throw new ClientError({ message: "请先登录", code: 401 })

    const geshuAgentLinked =
        (await prisma.account.count({
            where: {
                userId: user.id,
                providerId: GeshuAgentOAuthProviderId,
            },
        })) > 0

    return {
        id: user.id,
        name: user.name,
        nickname: user.nickname,
        phoneNumber: user.phoneNumber,
        role: user.role,
        geshuAgentLinked,
    }
})
