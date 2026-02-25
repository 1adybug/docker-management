import { getParser } from "."
import { z } from "zod/v4"

import { passwordSchema } from "./password"
import { phoneNumberSchema } from "./phoneNumber"
import { usernameSchema } from "./username"

export const registerPhonePasswordSchema = z.object(
    {
        name: usernameSchema,
        phoneNumber: phoneNumberSchema,
        password: passwordSchema,
    },
    { message: "无效的注册参数" },
)

export type RegisterPhonePasswordParams = z.infer<typeof registerPhonePasswordSchema>

export const registerPhonePasswordParser = getParser(registerPhonePasswordSchema)
