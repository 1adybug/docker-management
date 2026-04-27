import { getParser } from "."
import { z } from "zod/v4"

export const systemSettingValueSchema = z.preprocess(
    value => (value === null ? undefined : value),
    z.union([z.string(), z.number(), z.boolean(), z.undefined()]),
)

export type SystemSettingValueParams = z.infer<typeof systemSettingValueSchema>

export const updateSystemSettingsSchema = z.object(
    {
        values: z.record(z.string(), systemSettingValueSchema),
    },
    {
        message: "无效的系统设置参数",
    },
)

export type UpdateSystemSettingsParams = z.infer<typeof updateSystemSettingsSchema>

export const updateSystemSettingsParser = getParser(updateSystemSettingsSchema)
