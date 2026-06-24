import { getParser } from "."
import { z } from "zod/v4"

import { queryUserSchema } from "./queryUser"

function getRouteDateSchema(message: string) {
    return z.preprocess(value => {
        if (value === undefined || value === null || value === "") return undefined
        if (value instanceof Date) return value
        if (typeof value !== "string" && typeof value !== "number") return value

        const date = new Date(value)
        return Number.isNaN(date.valueOf()) ? value : date
    }, z.date({ message }).optional())
}

export const exportUserSchema = queryUserSchema.extend({
    createdBefore: getRouteDateSchema("无效的创建时间"),
    createdAfter: getRouteDateSchema("无效的创建时间"),
    updatedBefore: getRouteDateSchema("无效的更新时间"),
    updatedAfter: getRouteDateSchema("无效的更新时间"),
})

export type ExportUserParams = z.infer<typeof exportUserSchema>

export const exportUserParser = getParser(exportUserSchema)
