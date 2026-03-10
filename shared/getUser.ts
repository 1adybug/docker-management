import { prisma } from "@/prisma"

import { userIdSchema } from "@/schemas/userId"

import { createSharedFn } from "@/server/createSharedFn"
import { isAdmin } from "@/server/isAdmin"

import { ClientError } from "@/utils/clientError"

export const getUser = createSharedFn({
    name: "getUser",
    schema: userIdSchema,
    filter: isAdmin,
})(async function getUser(id) {
    const user = await prisma.user.findUnique({ where: { id } })
    if (!user) throw new ClientError("用户不存在")
    return user
})
