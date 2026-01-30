import { getPagination } from "deepsea-tools"

import { prisma } from "@/prisma"
import { defaultUserSelect } from "@/prisma/getUserSelect"
import { getUserWhere } from "@/prisma/getUserWhere"

import { UserOrderByWithRelationInput } from "@/prisma/generated/internal/prismaNamespace"

import { defaultPageNum } from "@/schemas/pageNum"
import { defaultPageSize } from "@/schemas/pageSize"
import { QueryUserParams } from "@/schemas/queryUser"

import { isAdmin } from "@/server/isAdmin"

export async function queryUser({
    id,
    username = "",
    phone = "",
    createdAfter,
    createdBefore,
    updatedAfter,
    updatedBefore,
    pageNum = defaultPageNum,
    pageSize = defaultPageSize,
    sortBy = "createdAt",
    sortOrder = "asc",
}: QueryUserParams) {
    const phoneItems = phone.split(/\s+/).filter(Boolean)
    const usernameItems = username.split(/\s+/).filter(Boolean)

    const where = id
        ? { id }
        : getUserWhere({
              createdAt: {
                  gte: createdAfter,
                  lte: createdBefore,
              },
              updatedAt: {
                  gte: updatedAfter,
                  lte: updatedBefore,
              },
              AND: [
                  ...usernameItems.map(item => ({
                      username: {
                          contains: item,
                      },
                  })),
                  ...phoneItems.map(item => ({
                      phone: {
                          contains: item,
                      },
                  })),
              ],
          })

    const orderBy: UserOrderByWithRelationInput[] = [
        {
            createdAt: sortBy === "createdAt" ? sortOrder : "asc",
        },
    ]

    if (sortBy !== "createdAt") {
        if (sortBy === "username" || sortBy === "phone" || sortBy === "role" || sortBy === "updatedAt") {
            orderBy.unshift({
                [sortBy]: sortOrder,
            })
        }
    }

    const data = await prisma.user.findMany({
        where,
        skip: (pageNum - 1) * pageSize,
        take: pageSize,
        select: defaultUserSelect,
        orderBy,
    })

    const total = await prisma.user.count({ where })

    return getPagination({
        data,
        exact: true,
        total,
        pageNum,
        pageSize,
    })
}

export type User = Awaited<ReturnType<typeof queryUser>>["list"][number]

queryUser.filter = isAdmin
