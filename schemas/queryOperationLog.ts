import { getParser } from "."
import { z } from "zod/v4"

import { createdAfterSchema } from "./createdAfter"
import { createdBeforeSchema } from "./createdBefore"
import { operationLogSortBySchema } from "./operationLogSortBy"
import { pageNumSchema } from "./pageNum"
import { pageSizeSchema } from "./pageSize"
import { sortOrderSchema } from "./sortOrder"

export const queryOperationLogSchema = z.object(
    {
        createdBefore: createdBeforeSchema.optional(),
        createdAfter: createdAfterSchema.optional(),
        action: z
            .string({ message: "无效的函数名" })
            .trim()
            .max(255, { message: `函数名长度不能超过 ${255} 个字符` })
            .optional(),
        ip: z
            .string({ message: "无效的 IP" })
            .trim()
            .max(255, { message: `IP 长度不能超过 ${255} 个字符` })
            .optional(),
        userAgent: z
            .string({ message: "无效的 UserAgent" })
            .trim()
            .max(255, { message: `UserAgent 长度不能超过 ${255} 个字符` })
            .optional(),
        username: z
            .string({ message: "无效的用户名" })
            .trim()
            .max(63, { message: `用户名长度不能超过 ${63} 个字符` })
            .optional(),
        pageNum: pageNumSchema.optional(),
        pageSize: pageSizeSchema.optional(),
        sortBy: operationLogSortBySchema.optional(),
        sortOrder: sortOrderSchema.optional(),
    },
    { message: "无效的查询配置" },
)

export type QueryOperationLogParams = z.infer<typeof queryOperationLogSchema>

export const queryOperationLogParser = getParser(queryOperationLogSchema)
