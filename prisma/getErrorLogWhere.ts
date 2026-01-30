import { DefaultArgs } from "@prisma/client/runtime/client"

import { Prisma } from "./generated/client"

export function getErrorLogWhere<T extends Prisma.ErrorLogFindManyArgs, P extends Prisma.SelectSubset<T, Prisma.ErrorLogFindManyArgs<DefaultArgs>>["where"]>(
    where: P,
): P {
    return where
}
