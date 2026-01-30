import { getParser } from "."
import { z } from "zod/v4"

import { phoneSchema } from "./phone"
import { usernameSchema } from "./username"

export const accountSchema = z.union([usernameSchema, phoneSchema], { message: "无效的用户名或手机号" })

export type AccountParams = z.infer<typeof accountSchema>

export const accountParser = getParser(accountSchema)
