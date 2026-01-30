import { z } from "zod/v4"

export const ProjectCommand = {
    启动: "up",
    停止: "down",
    重启: "restart",
    拉取: "pull",
    日志: "logs",
} as const

export type ProjectCommand = (typeof ProjectCommand)[keyof typeof ProjectCommand]

const projectCommandItems = Object.values(ProjectCommand) as [ProjectCommand, ...ProjectCommand[]]

export const projectCommandSchema = z.enum(projectCommandItems, { message: "无效的项目操作" })

export const ProjectCommandLabel = {
    [ProjectCommand.启动]: "启动",
    [ProjectCommand.停止]: "停止",
    [ProjectCommand.重启]: "重启",
    [ProjectCommand.拉取]: "拉取",
    [ProjectCommand.日志]: "日志",
} as const
