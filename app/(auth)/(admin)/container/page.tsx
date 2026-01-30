"use client"

import { FC } from "react"

import { IconPlayerPause, IconPlayerStopFilled, IconRefresh, IconTrash } from "@tabler/icons-react"
import { Button, Popconfirm, Table, Tag } from "antd"
import { formatTime } from "deepsea-tools"
import { Columns } from "soda-antd"

import { useQueryDockerContainer } from "@/hooks/useQueryDockerContainer"
import { useRunDockerContainer } from "@/hooks/useRunDockerContainer"

import { DockerContainerCommand } from "@/schemas/dockerContainerCommand"

import { DockerContainerItem } from "@/shared/queryDockerContainer"

const Page: FC = () => {
    const { data, isLoading, refetch } = useQueryDockerContainer()
    const { mutateAsync: runDockerContainer, isPending: isRunPending } = useRunDockerContainer()

    const isRequesting = isLoading || isRunPending

    function onRefresh() {
        refetch()
    }

    async function onCommand(id: string, command: DockerContainerCommand) {
        await runDockerContainer({ id, command })
    }

    const columns: Columns<DockerContainerItem> = [
        {
            title: "容器名称",
            dataIndex: "name",
            align: "left",
        },
        {
            title: "镜像",
            dataIndex: "image",
            align: "center",
        },
        {
            title: "状态",
            dataIndex: "status",
            align: "center",
        },
        {
            title: "创建时间",
            dataIndex: "createdAt",
            align: "center",
            render(value: string) {
                return formatTime(value)
            },
        },
        {
            title: "端口",
            dataIndex: "ports",
            align: "center",
            render(value: string) {
                return value || "-"
            },
        },
        {
            title: "项目",
            dataIndex: "projectName",
            align: "center",
            render(value: string | undefined, record) {
                if (!value) return "-"
                return (
                    <div className="flex flex-wrap justify-center gap-1">
                        <Tag color="blue">{value}</Tag>
                        {record.isManagedProject ? <Tag color="green">平台项目</Tag> : null}
                    </div>
                )
            },
        },
        {
            title: "操作",
            key: "operation",
            align: "center",
            render(value, record) {
                return (
                    <div className="inline-flex flex-wrap gap-1">
                        <Button
                            size="small"
                            shape="circle"
                            color="yellow"
                            variant="text"
                            disabled={isRequesting}
                            icon={<IconPlayerStopFilled className="size-4" />}
                            onClick={() => onCommand(record.id, DockerContainerCommand.停止)}
                        />
                        <Button
                            size="small"
                            shape="circle"
                            color="default"
                            variant="text"
                            disabled={isRequesting}
                            icon={<IconPlayerPause className="size-4" />}
                            onClick={() => onCommand(record.id, DockerContainerCommand.暂停)}
                        />
                        <Button
                            size="small"
                            shape="circle"
                            color="default"
                            variant="text"
                            disabled={isRequesting}
                            icon={<IconRefresh className="size-4" />}
                            onClick={() => onCommand(record.id, DockerContainerCommand.重启)}
                        />
                        <Popconfirm title="确认删除容器" description="删除后将无法恢复" onConfirm={() => onCommand(record.id, DockerContainerCommand.删除)}>
                            <Button
                                size="small"
                                shape="circle"
                                color="danger"
                                variant="text"
                                disabled={isRequesting}
                                icon={<IconTrash className="size-4" />}
                            />
                        </Popconfirm>
                    </div>
                )
            },
        },
    ]

    return (
        <div className="flex h-full flex-col gap-4 pt-4">
            <title>容器管理</title>
            <div className="flex items-center px-4">
                <div>Docker 容器</div>
                <Button className="ml-auto" color="primary" disabled={isRequesting} onClick={onRefresh}>
                    刷新
                </Button>
            </div>
            <div className="px-4">
                <Table<DockerContainerItem> columns={columns} dataSource={data} loading={isLoading} rowKey="id" pagination={false} />
            </div>
        </div>
    )
}

export default Page
