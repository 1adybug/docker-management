import { getPagination } from "deepsea-tools"

import { prisma } from "@/prisma"
import { getOperationLogWhere } from "@/prisma/getOperationLogWhere"

import { OperationLogOrderByWithRelationInput } from "@/prisma/generated/internal/prismaNamespace"

import { defaultPageNum } from "@/schemas/pageNum"
import { defaultPageSize } from "@/schemas/pageSize"
import { QueryOperationLogParams } from "@/schemas/queryOperationLog"

import { getCurrentUser } from "@/server/getCurrentUser"
import { isAdmin } from "@/server/isAdmin"

export async function queryOperationLog({
    createdBefore,
    createdAfter,
    action = "",
    ip = "",
    userAgent = "",
    username = "",
    pageNum = defaultPageNum,
    pageSize = defaultPageSize,
    sortBy = "createdAt",
    sortOrder = "desc",
}: QueryOperationLogParams) {
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
            ...username
                .split(" ")
                .filter(Boolean)
                .map(item => ({ username: { contains: item } })),
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
            if (sortBy === "username") {
                orderBy.unshift({
                    user: {
                        username: sortOrder,
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
}

export type OperationLog = Awaited<ReturnType<typeof queryOperationLog>>["list"][number]

queryOperationLog.filter = isAdmin
