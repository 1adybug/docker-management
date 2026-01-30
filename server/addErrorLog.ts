import { prisma } from "@/prisma"

import { ClientError } from "@/utils/clientError"
import { stringifyParams } from "@/utils/stringifyParams"

import { getCurrentUser } from "./getCurrentUser"
import { getIp } from "./getIp"
import { getUserAgent } from "./getUserAgent"

function getConstructorName(obj: unknown): string {
    if (obj === undefined || obj === null) return "unknown"
    return obj.constructor.name
}

function getStringProperty(obj: unknown, key: string): string | undefined {
    return ((obj ?? {}) as any)[key]
}

export interface AddErrorLogParams {
    error: unknown
    action?: string
    args?: unknown[]
}

export async function addErrorLog({ error, action, args }: AddErrorLogParams) {
    try {
        const user = await getCurrentUser()
        const params = stringifyParams(args)
        await prisma.$transaction([
            prisma.errorLog.create({
                data: {
                    type: getConstructorName(error),
                    message: getStringProperty(error, "message") ?? String(error),
                    stack: getStringProperty(error, "stack"),
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

        if (error instanceof ClientError && error.origin) {
            await addErrorLog({
                error: error.origin,
                action,
                args,
            })
        }
    } catch (error) {
        console.error(error)
    }
}
