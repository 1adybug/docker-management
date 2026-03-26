import { getParser } from "."
import { z } from "zod/v4"

import { nicknameSchema } from "./nickname"
import { phoneNumberSchema } from "./phoneNumber"
import { usernameSchema } from "./username"
import { UserRoleSchema } from "./userRole"

export const addUserSchema = z.object(
    {
        name: usernameSchema,
        nickname: nicknameSchema,
        phoneNumber: phoneNumberSchema,
        role: UserRoleSchema,
    },
    { message: "无效的用户参数" },
)

export type AddUserParams = z.infer<typeof addUserSchema>

export const addUserParser = getParser(addUserSchema)
