import { getParser } from "."
import { z } from "zod"

import { phoneNumberSchema } from "./phoneNumber"
import { usernameSchema } from "./username"

export const accountSchema = z.union([usernameSchema, phoneNumberSchema], "无效的用户名或手机号")

export type AccountParams = z.infer<typeof accountSchema>

export const accountParser = getParser(accountSchema)
