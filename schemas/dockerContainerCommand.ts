import { z } from "zod/v4"

export const DockerContainerCommand = {
    停止: "stop",
    暂停: "pause",
    重启: "restart",
    删除: "delete",
} as const

export type DockerContainerCommand = (typeof DockerContainerCommand)[keyof typeof DockerContainerCommand]

const dockerContainerCommandItems = Object.values(DockerContainerCommand) as [DockerContainerCommand, ...DockerContainerCommand[]]

export const dockerContainerCommandSchema = z.enum(dockerContainerCommandItems, { message: "无效的容器操作" })

export const DockerContainerCommandLabel = {
    [DockerContainerCommand.停止]: "停止",
    [DockerContainerCommand.暂停]: "暂停",
    [DockerContainerCommand.重启]: "重启",
    [DockerContainerCommand.删除]: "删除",
} as const
