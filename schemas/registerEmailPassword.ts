import { getParser } from "."
import { z } from "zod/v4"

import { emailSchema } from "./email"
import { passwordSchema } from "./password"
import { usernameSchema } from "./username"

export const registerEmailPasswordSchema = z.object(
    {
        name: usernameSchema,
        email: emailSchema,
        password: passwordSchema,
    },
    { message: "无效的注册参数" },
)

export type RegisterEmailPasswordParams = z.infer<typeof registerEmailPasswordSchema>

export const registerEmailPasswordParser = getParser(registerEmailPasswordSchema)
