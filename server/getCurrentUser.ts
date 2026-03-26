import { headers } from "next/headers"

import { prisma } from "@/prisma"

import { User } from "@/prisma/generated/client"

import { auth } from "./auth"

export async function getCurrentUser(): Promise<User | undefined> {
    const session = await auth.api.getSession({
        headers: await headers(),
    })
    const user = session?.user
    if (!user) return undefined

    const currentUser = await prisma.user.findUnique({
        where: { id: user.id },
    })

    return currentUser || undefined
}
