import { assignFnName } from "deepsea-tools"

import { prisma } from "@/prisma"

import { UserIdParams, userIdSchema } from "@/schemas/userId"

import { createFilter } from "@/server/createFilter"
import { isAdmin } from "@/server/isAdmin"

import { ClientError } from "@/utils/clientError"

export async function getUser(id: UserIdParams) {
    const user = await prisma.user.findUnique({ where: { id } })
    if (!user) throw new ClientError("用户不存在")
    return user
}

assignFnName(getUser, "getUser")

getUser.schema = userIdSchema

getUser.filter = createFilter(isAdmin)
