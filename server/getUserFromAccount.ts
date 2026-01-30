import { prisma } from "@/prisma"

import { User } from "@/prisma/generated/client"

import { AccountParams } from "@/schemas/account"
import { phoneRegex } from "@/schemas/phone"

export async function getUserFromAccount(account: AccountParams) {
    let user: User | null = null

    if (phoneRegex.test(account)) user = await prisma.user.findUnique({ where: { phone: account } })
    else user = await prisma.user.findUnique({ where: { username: account } })

    return user || undefined
}
