import { getParser } from "."
import { z } from "zod/v4"

import { ProjectStartMountPathKind, projectStartMountPathKindSchema } from "./projectStartMountPathKind"

export interface ProjectStartMountOption {
    key: string
    pathKind: ProjectStartMountPathKind
    createDirectory?: boolean
}

export const projectStartMountOptionSchema = z.object(
    {
        key: z.string({ message: "无效的挂载路径选项" }).min(1, { message: "无效的挂载路径选项" }),
        pathKind: projectStartMountPathKindSchema,
        createDirectory: z.boolean().optional(),
    },
    { message: "无效的挂载路径选项" },
)

export type ProjectStartMountOptionParams = z.infer<typeof projectStartMountOptionSchema>

export const projectStartMountOptionParser = getParser(projectStartMountOptionSchema)
