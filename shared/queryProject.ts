import { getPagination } from "deepsea-tools"

import { prisma } from "@/prisma"

import { defaultPageNum } from "@/schemas/pageNum"
import { defaultPageSize } from "@/schemas/pageSize"
import { QueryProjectParams } from "@/schemas/queryProject"

import { isAdmin } from "@/server/isAdmin"

export interface ProjectSummary {
    name: string
    updatedAt: number
}

export async function queryProject({ name = "", updatedAfter, updatedBefore, pageNum = defaultPageNum, pageSize = defaultPageSize }: QueryProjectParams = {}) {
    const nameItems = name.split(/\s+/).filter(Boolean)

    const where = {
        updatedAt: {
            gte: updatedAfter,
            lte: updatedBefore,
        },
        AND: nameItems.map(item => ({
            name: {
                contains: item,
            },
        })),
    }

    const data = await prisma.project.findMany({
        where,
        skip: (pageNum - 1) * pageSize,
        take: pageSize,
        orderBy: {
            updatedAt: "desc",
        },
        select: {
            name: true,
            updatedAt: true,
        },
    })

    const total = await prisma.project.count({ where })

    return getPagination({
        data: data.map(item => ({ name: item.name, updatedAt: item.updatedAt.valueOf() })),
        exact: true,
        total,
        pageNum,
        pageSize,
    })
}

queryProject.filter = isAdmin
