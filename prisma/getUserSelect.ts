import { DefaultArgs } from "@prisma/client/runtime/client"

import { checkSelect } from "@/server/checkSelect"

import { Prisma, User } from "./generated/client"

export function getUserSelect<T extends Prisma.UserFindManyArgs, P extends Prisma.SelectSubset<T, Prisma.UserFindManyArgs<DefaultArgs>>["select"]>(
    select: P,
): P {
    return select
}

export const defaultUserSelect = getUserSelect({
    id: true,
    createdAt: true,
    updatedAt: true,
    email: true,
    phoneNumber: true,
    role: true,
    name: true,
    image: true,
    emailVerified: true,
    phoneNumberVerified: true,
    banned: true,
    banReason: true,
    banExpires: true,
})

checkSelect<User>(defaultUserSelect)
