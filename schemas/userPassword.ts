import { getParser } from "."
import { z } from "zod"

import { passwordSchema } from "./password"

export const userPasswordSchema = z
    .union([
        z
            .string({ message: "无效的密码" })
            .trim()
            .length(0, { message: "无效的密码" })
            .transform(() => null),
        passwordSchema,
    ])
    .nullable()

export type UserPasswordParams = z.infer<typeof userPasswordSchema>

export const userPasswordParser = getParser(userPasswordSchema)
