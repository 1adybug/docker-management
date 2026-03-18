import { getParser } from "."
import { z } from "zod/v4"

import { projectNameSchema } from "./projectName"

export const checkProjectStartSchema = z.object(
    {
        name: projectNameSchema,
    },
    { message: "无效的项目启动预检查参数" },
)

export type CheckProjectStartParams = z.infer<typeof checkProjectStartSchema>

export const checkProjectStartParser = getParser(checkProjectStartSchema)

export const ProjectStartMountStatus = {
    已存在: "exists",
    将创建: "create",
    不可创建: "blocked",
} as const

export type ProjectStartMountStatus = (typeof ProjectStartMountStatus)[keyof typeof ProjectStartMountStatus]

/** 启动前挂载目录检查项 */
export interface ProjectStartMountItem {
    sourcePath: string
    resolvedPath: string
    isAbsolutePath: boolean
    status: ProjectStartMountStatus
    message?: string
}

/** 启动前挂载目录检查结果 */
export interface CheckProjectStartResult {
    items: ProjectStartMountItem[]
    canStart: boolean
    blockedCount: number
    createCount: number
    existsCount: number
}

/** 检查 compose 挂载目录参数 */
export interface EnsureComposeMountDirectoriesParams {
    projectDir: string
    content: string
}
