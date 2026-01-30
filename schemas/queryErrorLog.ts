import { getParser } from "."
import { z } from "zod/v4"

import { createdAfterSchema } from "./createdAfter"
import { createdBeforeSchema } from "./createdBefore"
import { errorLogSortBySchema } from "./errorLogSortBy"
import { pageNumSchema } from "./pageNum"
import { pageSizeSchema } from "./pageSize"
import { sortOrderSchema } from "./sortOrder"

export const queryErrorLogSchema = z.object(
    {
        createdBefore: createdBeforeSchema.optional(),
        createdAfter: createdAfterSchema.optional(),
        type: z
            .string({ message: "无效的类型" })
            .trim()
            .max(255, { message: `类型长度不能超过 ${255} 个字符` })
            .optional(),
        message: z.string({ message: "无效的消息" }).trim().optional(),
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
        sortBy: errorLogSortBySchema.optional(),
        sortOrder: sortOrderSchema.optional(),
    },
    { message: "无效的查询配置" },
)

export type QueryErrorLogParams = z.infer<typeof queryErrorLogSchema>

export const queryErrorLogParser = getParser(queryErrorLogSchema)
