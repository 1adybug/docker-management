import { getParser } from "."
import { z } from "zod/v4"

import { addUserSchema } from "./addUser"

export const createFirstUserSchema = addUserSchema.omit({
    role: true,
})

export type CreateFirstUserParams = z.infer<typeof createFirstUserSchema>

export const createFirstUserParser = getParser(createFirstUserSchema)
