import { prisma } from "@/prisma"
import { defaultUserSelect } from "@/prisma/getUserSelect"

import { IdParams } from "@/schemas/id"

import { isAdmin } from "@/server/isAdmin"

import { ClientError } from "@/utils/clientError"

export async function getUser(id: IdParams) {
    const user = await prisma.user.findUnique({ where: { id }, select: defaultUserSelect })
    if (!user) throw new ClientError("用户不存在")
    return user
}

getUser.filter = isAdmin
