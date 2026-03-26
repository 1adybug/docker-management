import { getPagination } from "deepsea-tools"

import { prisma } from "@/prisma"
import { defaultUserSelect } from "@/prisma/getUserSelect"
import { getUserWhere } from "@/prisma/getUserWhere"

import { UserOrderByWithRelationInput } from "@/prisma/generated/internal/prismaNamespace"

import { defaultPageNum } from "@/schemas/pageNum"
import { defaultPageSize } from "@/schemas/pageSize"
import { queryUserSchema } from "@/schemas/queryUser"

import { createSharedFn } from "@/server/createSharedFn"
import { isAdmin } from "@/server/isAdmin"

export const queryUser = createSharedFn({
    name: "queryUser",
    schema: queryUserSchema,
    filter: isAdmin,
})(async function queryUser({
    id,
    name = "",
    nickname = "",
    email = "",
    phoneNumber = "",
    createdAfter,
    createdBefore,
    updatedAfter,
    updatedBefore,
    pageNum = defaultPageNum,
    pageSize = defaultPageSize,
    sortBy = "createdAt",
    sortOrder = "asc",
}) {
    const phoneNumberItems = phoneNumber.split(/\s+/).filter(Boolean)
    const nameItems = name.split(/\s+/).filter(Boolean)
    const nicknameItems = nickname.split(/\s+/).filter(Boolean)
    const emailItems = email.split(/\s+/).filter(Boolean)

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
