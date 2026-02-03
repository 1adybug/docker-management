import { z } from "zod/v4"

export const ComposeProjectCommand = {
    启动: "up",
    停止: "down",
    重启: "restart",
    拉取: "pull",
    日志: "logs",
    删除: "delete",
} as const

export type ComposeProjectCommand = (typeof ComposeProjectCommand)[keyof typeof ComposeProjectCommand]

const composeProjectCommandItems = Object.values(ComposeProjectCommand) as [ComposeProjectCommand, ...ComposeProjectCommand[]]

export const composeProjectCommandSchema = z.enum(composeProjectCommandItems, { message: "无效的项目操作" })

export const ComposeProjectCommandLabel = {
    [ComposeProjectCommand.启动]: "启动",
    [ComposeProjectCommand.停止]: "停止",
    [ComposeProjectCommand.重启]: "重启",
    [ComposeProjectCommand.拉取]: "拉取",
    [ComposeProjectCommand.日志]: "日志",
    [ComposeProjectCommand.删除]: "删除",
} as const
