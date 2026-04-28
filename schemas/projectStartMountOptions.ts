import { getParser } from "."
import { z } from "zod/v4"

import { projectStartMountOptionSchema } from "./projectStartMountOption"

export const projectStartMountOptionsSchema = z.array(projectStartMountOptionSchema)

export type ProjectStartMountOptionsParams = z.infer<typeof projectStartMountOptionsSchema>

export const projectStartMountOptionsParser = getParser(projectStartMountOptionsSchema)
