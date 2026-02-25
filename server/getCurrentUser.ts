import { headers } from "next/headers"

import { User } from "@/prisma/generated/client"

import { UserRole } from "@/schemas/userRole"

import { auth } from "./auth"

export async function getCurrentUser(): Promise<User | undefined> {
    const session = await auth.api.getSession({
        headers: await headers(),
    })
    const user = session?.user
    if (!user) return undefined
    const { phoneNumber, image = null, role = UserRole.用户, banned = false, banReason = null, banExpires = null, phoneNumberVerified = false, ...rest } = user
    return {
        banned,
        banExpires,
        banReason,
        role: role as UserRole,
        image,
        phoneNumber: phoneNumber!,
        phoneNumberVerified,
        ...rest,
    }
}
