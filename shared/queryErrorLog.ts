import { getPagination } from "deepsea-tools"

import { prisma } from "@/prisma"
import { getErrorLogWhere } from "@/prisma/getErrorLogWhere"

import { ErrorLogOrderByWithRelationInput } from "@/prisma/generated/internal/prismaNamespace"

import { defaultPageNum } from "@/schemas/pageNum"
import { defaultPageSize } from "@/schemas/pageSize"
import { QueryErrorLogParams } from "@/schemas/queryErrorLog"

import { isAdmin } from "@/server/isAdmin"

export async function queryErrorLog({
    createdBefore,
    createdAfter,
    type = "",
    message = "",
    action = "",
    ip = "",
    userAgent = "",
    username = "",
    pageNum = defaultPageNum,
    pageSize = defaultPageSize,
    sortBy = "createdAt",
    sortOrder = "desc",
}: QueryErrorLogParams) {
    const where = getErrorLogWhere({
        AND: [
            ...type
                .split(" ")
                .filter(Boolean)
                .map(item => ({ type: { contains: item } })),
            ...message
                .split(" ")
                .filter(Boolean)
                .map(item => ({ message: { contains: item } })),
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
    })

    const orderBy: ErrorLogOrderByWithRelationInput[] = [
        {
            createdAt: sortBy === "createdAt" ? sortOrder : "asc",
        },
    ]

    if (sortBy !== "createdAt") {
        if (sortBy === "action" || sortBy === "ip" || sortBy === "userAgent" || sortBy === "type" || sortBy === "message") {
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

    const data = await prisma.errorLog.findMany({
        where,
        orderBy,
        skip: (pageNum - 1) * pageSize,
        take: pageSize,
        include: {
            user: true,
        },
    })

    const total = await prisma.errorLog.count({
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

export type ErrorLog = Awaited<ReturnType<typeof queryErrorLog>>["list"][number]

queryErrorLog.filter = isAdmin
