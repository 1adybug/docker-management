import { getParser } from "."
import { z } from "zod/v4"

import { addUserSchema } from "./addUser"
import { userIdSchema } from "./userId"

export const updateUserSchema = addUserSchema.partial().extend(
    z.object({
        id: userIdSchema,
    }).shape,
)

export type UpdateUserParams = z.infer<typeof updateUserSchema>

export const updateUserParser = getParser(updateUserSchema)
