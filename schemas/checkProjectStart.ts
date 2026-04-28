import { getParser } from "."
import { z } from "zod/v4"

import { projectNameSchema } from "./projectName"
import { ProjectStartMountOption } from "./projectStartMountOption"
import { projectStartMountOptionsSchema } from "./projectStartMountOptions"
import { ProjectStartMountPathKind } from "./projectStartMountPathKind"

export const checkProjectStartSchema = z.object(
    {
        name: projectNameSchema,
        mountPathOptions: projectStartMountOptionsSchema.optional(),
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

/** 启动前挂载路径检查项 */
export interface ProjectStartMountItem {
    key: string
    serviceName: string
    sourcePath: string
    targetPath: string
    resolvedPath: string
    isAbsolutePath: boolean
    exists: boolean
    canConfigure: boolean
    pathKind: ProjectStartMountPathKind
    createDirectory?: boolean
    status: ProjectStartMountStatus
    message?: string
}

/** 启动前挂载路径检查结果 */
export interface CheckProjectStartResult {
    items: ProjectStartMountItem[]
    canStart: boolean
    blockedCount: number
    createCount: number
    existsCount: number
}

/** 检查 compose 挂载路径参数 */
export interface EnsureComposeMountPathsParams {
    projectDir: string
    content: string
    mountPathOptions?: ProjectStartMountOption[]
}
