import type { DefaultArgs } from "@prisma/client/runtime/client"

import type { Prisma } from "./generated/client"

export function getUserWhere<T extends Prisma.UserFindManyArgs, P extends Prisma.SelectSubset<T, Prisma.UserFindManyArgs<DefaultArgs>>["where"]>(where: P): P {
    return where
}
