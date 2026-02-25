import { getParser } from "."
import { z } from "zod"

import { banReasonSchema } from "./banReason"
import { userIdSchema } from "./userId"

export const banUserSchema = z.object({
    userId: userIdSchema,
    banReason: banReasonSchema.optional(),
    banExpiresIn: z.int().min(1).optional(),
})

export type BanUserParams = z.infer<typeof banUserSchema>

export const banUserParser = getParser(banUserSchema)
