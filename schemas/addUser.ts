import { getParser } from "."
import { z } from "zod/v4"

import { phoneSchema } from "./phone"
import { roleSchema } from "./role"
import { usernameSchema } from "./username"

export const addUserSchema = z.object(
    {
        username: usernameSchema,
        phone: phoneSchema,
        role: roleSchema,
    },
    { message: "无效的用户参数" },
)

export type AddUserParams = z.infer<typeof addUserSchema>

export const addUserParser = getParser(addUserSchema)
