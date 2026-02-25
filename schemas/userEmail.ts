import { getParser } from "."
import { z } from "zod"

import { emailSchema } from "./email"

export const userEmailSchema = z
    .union([
        z
            .string({ message: "无效的邮箱" })
            .trim()
            .length(0, { message: "无效的邮箱" })
            .transform(() => null),
        emailSchema,
    ])
    .nullable()

export type UserEmailParams = z.infer<typeof userEmailSchema>

export const userEmailParser = getParser(userEmailSchema)
