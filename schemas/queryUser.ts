import { getParser } from "."
import { z } from "zod/v4"

import { createdAfterSchema } from "./createdAfter"
import { createdBeforeSchema } from "./createdBefore"
import { pageNumSchema } from "./pageNum"
import { pageSizeSchema } from "./pageSize"
import { sortOrderSchema } from "./sortOrder"
import { updatedAfterSchema } from "./updatedAfter"
import { updatedBeforeSchema } from "./updatedBefore"
import { userIdSchema } from "./userId"
import { userSortBySchema } from "./userSortBy"

export const queryUserSchema = z.object(
    {
        id: userIdSchema.optional(),
        name: z.string({ message: "无效的用户名" }).trim().optional(),
        email: z.string({ message: "无效的邮箱" }).trim().optional(),
        phoneNumber: z.string({ message: "无效的手机号" }).trim().optional(),
        createdBefore: createdBeforeSchema.optional(),
        createdAfter: createdAfterSchema.optional(),
        updatedBefore: updatedBeforeSchema.optional(),
        updatedAfter: updatedAfterSchema.optional(),
        pageNum: pageNumSchema.optional(),
        pageSize: pageSizeSchema.optional(),
        sortBy: userSortBySchema.optional(),
        sortOrder: sortOrderSchema.optional(),
    },
    {
        message: "无效的查询参数",
    },
)

export type QueryUserParams = z.infer<typeof queryUserSchema>

export const queryUserParser = getParser(queryUserSchema)
