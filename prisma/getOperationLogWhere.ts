import { DefaultArgs } from "@prisma/client/runtime/client"

import { Prisma } from "./generated/client"

export function getOperationLogWhere<
    T extends Prisma.OperationLogFindManyArgs,
    P extends Prisma.SelectSubset<T, Prisma.OperationLogFindManyArgs<DefaultArgs>>["where"],
>(where: P): P {
    return where
}
