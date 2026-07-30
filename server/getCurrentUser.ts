import { headers } from "next/headers"

import { prisma } from "@/prisma"

import type { User } from "@/prisma/generated/client"

import { auth } from "./auth"
import { getGeshuAgentSkillAccessTokenUser } from "./geshuAgentSkillAuthorization"
import { isSkillAuthorizationRequest } from "./skillAuthorizationRequestContext"

export async function getCurrentUser(): Promise<User | undefined> {
    const requestHeaders = await headers()
    const authorization = requestHeaders.get("authorization")
    if (authorization && isSkillAuthorizationRequest()) return await getGeshuAgentSkillAccessTokenUser(authorization)

    const session = await auth.api.getSession({
        headers: requestHeaders,
    })
    const user = session?.user
    if (!user) return undefined

    const currentUser = await prisma.user.findUnique({
        where: { id: user.id },
    })

    return currentUser || undefined
}
