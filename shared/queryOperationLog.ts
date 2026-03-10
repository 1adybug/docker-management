import { getPagination } from "deepsea-tools"

import { prisma } from "@/prisma"
import { getOperationLogWhere } from "@/prisma/getOperationLogWhere"

import { OperationLogOrderByWithRelationInput } from "@/prisma/generated/internal/prismaNamespace"

import { defaultPageNum } from "@/schemas/pageNum"
import { defaultPageSize } from "@/schemas/pageSize"
import { queryOperationLogSchema } from "@/schemas/queryOperationLog"

import { createSharedFn } from "@/server/createSharedFn"
import { getCurrentUser } from "@/server/getCurrentUser"
import { isAdmin } from "@/server/isAdmin"

export const queryOperationLog = createSharedFn({
    name: "queryOperationLog",
    schema: queryOperationLogSchema,
    filter: isAdmin,
})(async function queryOperationLog({
    createdBefore,
    createdAfter,
    action = "",
    ip = "",
    userAgent = "",
    name = "",
    pageNum = defaultPageNum,
    pageSize = defaultPageSize,
    sortBy = "createdAt",
    sortOrder = "desc",
}) {
    const user = await getCurrentUser()

    const where = getOperationLogWhere({
        AND: [
            ...action
                .split(" ")
                .filter(Boolean)
                .map(item => ({ action: { contains: item } })),
            ...ip
                .split(" ")
                .filter(Boolean)
                .map(item => ({ ip: { contains: item } })),
            ...userAgent
                .split(" ")
                .filter(Boolean)
                .map(item => ({ userAgent: { contains: item } })),
            ...name
                .split(" ")
                .filter(Boolean)
                .map(item => ({ name: { contains: item } })),
        ],
        createdAt: {
            gte: createdAfter,
            lte: createdBefore,
        },
        OR: [
            {
                action: {
                    not: "queryOperationLog",
                },
            },
            {
                userId: {
                    not: user?.id,
                },
            },
        ],
    })

    const orderBy: OperationLogOrderByWithRelationInput[] = [
        {
            createdAt: sortBy === "createdAt" ? sortOrder : "asc",
        },
    ]

    if (sortBy !== "createdAt") {
        if (sortBy === "action" || sortBy === "ip" || sortBy === "userAgent") {
            orderBy.unshift({
                [sortBy]: sortOrder,
            })
        } else {
            if (sortBy === "name") {
                orderBy.unshift({
                    user: {
                        name: sortOrder,
                    },
                })
            }
        }
    }

    const data = await prisma.operationLog.findMany({
        where,
        orderBy,
        skip: (pageNum - 1) * pageSize,
        take: pageSize,
        include: {
            user: true,
        },
    })

    const total = await prisma.operationLog.count({
        where,
    })

    return getPagination({
        data,
        exact: true,
        total,
        pageNum,
        pageSize,
    })
})

export type OperationLog = Awaited<ReturnType<typeof queryOperationLog>>["list"][number]
