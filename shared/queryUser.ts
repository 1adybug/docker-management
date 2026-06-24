import { getPagination } from "deepsea-tools"

import { prisma } from "@/prisma"
import { defaultUserSelect } from "@/prisma/getUserSelect"
import { getUserWhere } from "@/prisma/getUserWhere"

import type { UserOrderByWithRelationInput } from "@/prisma/generated/internal/prismaNamespace"

import { defaultPageNum } from "@/schemas/pageNum"
import { defaultPageSize } from "@/schemas/pageSize"
import { type QueryUserParams, queryUserSchema } from "@/schemas/queryUser"

import { createSharedFn } from "@/server/createSharedFn"
import { isAdmin } from "@/server/isAdmin"

export function getQueryUserWhere({
    id,
    name = "",
    nickname = "",
    email = "",
    phoneNumber = "",
    createdAfter,
    createdBefore,
    updatedAfter,
    updatedBefore,
}: QueryUserParams = {}) {
    const phoneNumberItems = phoneNumber.split(/\s+/).filter(Boolean)
    const nameItems = name.split(/\s+/).filter(Boolean)
    const nicknameItems = nickname.split(/\s+/).filter(Boolean)
    const emailItems = email.split(/\s+/).filter(Boolean)

    return id
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
                  ...nameItems.map(item => ({
                      name: {
                          contains: item,
                      },
                  })),
                  ...nicknameItems.map(item => ({
                      nickname: {
                          contains: item,
                      },
                  })),
                  ...emailItems.map(item => ({
                      email: {
                          contains: item,
                      },
                  })),
                  ...phoneNumberItems.map(item => ({
                      phoneNumber: {
                          contains: item,
                      },
                  })),
              ],
          })
}

export function getQueryUserOrderBy({ sortBy = "createdAt", sortOrder = "asc" }: Pick<QueryUserParams, "sortBy" | "sortOrder"> = {}) {
    const orderBy: UserOrderByWithRelationInput[] = [
        {
            createdAt: sortBy === "createdAt" ? sortOrder : "asc",
        },
    ]

    if (sortBy !== "createdAt") {
        if (
            sortBy === "name" ||
            sortBy === "nickname" ||
            sortBy === "email" ||
            sortBy === "phoneNumber" ||
            sortBy === "role" ||
            sortBy === "updatedAt" ||
            sortBy === "banned"
        ) {
            orderBy.unshift({
                [sortBy]: sortOrder,
            })
        }
    }

    return orderBy
}

export const queryUser = createSharedFn({
    name: "queryUser",
    schema: queryUserSchema,
    filter: isAdmin,
})(async function queryUser({ pageNum = defaultPageNum, pageSize = defaultPageSize, ...params }) {
    const where = getQueryUserWhere(params)
    const orderBy = getQueryUserOrderBy(params)

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
})
