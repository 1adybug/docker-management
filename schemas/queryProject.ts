import { getParser } from "."
import { z } from "zod/v4"

import { pageNumSchema } from "./pageNum"
import { pageSizeSchema } from "./pageSize"
import { updatedAfterSchema } from "./updatedAfter"
import { updatedBeforeSchema } from "./updatedBefore"

export const queryProjectSchema = z.object(
    {
        name: z.string({ message: "无效的项目名称" }).trim().optional(),
        updatedAfter: updatedAfterSchema.optional(),
        updatedBefore: updatedBeforeSchema.optional(),
        pageNum: pageNumSchema.optional(),
        pageSize: pageSizeSchema.optional(),
    },
    { message: "无效的项目参数" },
)

export type QueryProjectParams = z.infer<typeof queryProjectSchema>

export const queryProjectParser = getParser(queryProjectSchema)
