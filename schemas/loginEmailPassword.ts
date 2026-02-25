import { getParser } from "."
import { z } from "zod/v4"

import { emailSchema } from "./email"
import { passwordSchema } from "./password"

export const loginEmailPasswordSchema = z.object(
    {
        email: emailSchema,
        password: passwordSchema,
    },
    { message: "无效的登录参数" },
)

export type LoginEmailPasswordParams = z.infer<typeof loginEmailPasswordSchema>

export const loginEmailPasswordParser = getParser(loginEmailPasswordSchema)
