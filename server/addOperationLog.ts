import { prisma } from "@/prisma"

import { stringifyParams } from "@/utils/stringifyParams"

import { getCurrentUser } from "./getCurrentUser"
import { getIp } from "./getIp"
import { getUserAgent } from "./getUserAgent"

export interface AddOperationLogParams {
    action?: string
    args?: unknown[]
}

export async function addOperationLog({ action, args }: AddOperationLogParams) {
    try {
        const user = await getCurrentUser()
        const params = stringifyParams(args)
        await prisma.$transaction([
            prisma.operationLog.create({
                data: {
                    action,
                    params,
                    ip: await getIp(),
                    userAgent: await getUserAgent(),
                    username: user?.username,
                    phone: user?.phone,
                    role: user?.role,
                    userId: user?.id,
                },
            }),
        ])
    } catch (error) {
        console.error(error)
    }
}
