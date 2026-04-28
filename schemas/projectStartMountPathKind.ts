import { getParser } from "."
import { z } from "zod/v4"

export const ProjectStartMountPathKind = {
    文件: "file",
    文件夹: "directory",
} as const

export type ProjectStartMountPathKind = (typeof ProjectStartMountPathKind)[keyof typeof ProjectStartMountPathKind]

export const projectStartMountPathKindSchema = z.enum([ProjectStartMountPathKind.文件, ProjectStartMountPathKind.文件夹], {
    message: "无效的挂载路径类型",
})

export type ProjectStartMountPathKindParams = z.infer<typeof projectStartMountPathKindSchema>

export const projectStartMountPathKindParser = getParser(projectStartMountPathKindSchema)
