import { getParser } from "."
import { z } from "zod/v4"

import { passwordSchema } from "./password"
import { phoneNumberSchema } from "./phoneNumber"

export const loginPhonePasswordSchema = z.object(
    {
        phoneNumber: phoneNumberSchema,
        password: passwordSchema,
    },
    { message: "无效的登录参数" },
)

export type LoginPhonePasswordParams = z.infer<typeof loginPhonePasswordSchema>

export const loginPhonePasswordParser = getParser(loginPhonePasswordSchema)
