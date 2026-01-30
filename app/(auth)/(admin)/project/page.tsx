"use client"

import { FC, useState } from "react"

import { IconDownload, IconEdit, IconFileText, IconPlayerPlay, IconPlayerStop, IconRefresh, IconTrash } from "@tabler/icons-react"
import { Button, Popconfirm, Table } from "antd"
import { formatTime } from "deepsea-tools"
import { Columns } from "soda-antd"
import { useRouter } from "next/navigation"

import ProjectLogDrawer from "./_components/ProjectLogDrawer"

import { useDeleteProject } from "@/hooks/useDeleteProject"
import { useQueryProject } from "@/hooks/useQueryProject"
import { useRunProject } from "@/hooks/useRunProject"

import { ProjectCommand } from "@/schemas/projectCommand"

import { ProjectSummary } from "@/shared/queryProject"

const Page: FC = () => {
    const [logOpen, setLogOpen] = useState(false)
    const [logName, setLogName] = useState<string | undefined>(undefined)
    const [logContent, setLogContent] = useState<string | undefined>(undefined)

    const router = useRouter()

    const { data, isLoading } = useQueryProject()
    const { mutateAsync: deleteProject, isPending: isDeletePending } = useDeleteProject()
    const { mutateAsync: runProject, isPending: isRunPending } = useRunProject()

    const isRequesting = isLoading || isDeletePending || isRunPending

    function onAdd() {
        router.push("/project/editor")
    }

    function onEdit(name: string) {
        router.push(`/project/editor?name=${encodeURIComponent(name)}`)
    }

    function onCloseLog() {
        setLogOpen(false)
        setLogName(undefined)
        setLogContent(undefined)
    }

    async function onCommand(name: string, command: ProjectCommand) {
        const result = await runProject({ name, command })
        if (command !== ProjectCommand.日志) return
        setLogName(name)
        setLogContent(result.output)
        setLogOpen(true)
    }

    async function onDelete(name: string) {
        await deleteProject({ name })
    }

    const columns: Columns<ProjectSummary> = [
        {
            title: "项目名称",
            dataIndex: "name",
            align: "center",
        },
        {
            title: "更新时间",
            dataIndex: "updatedAt",
            align: "center",
            render(value) {
                return formatTime(value)
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
                            color="default"
                            variant="text"
                            disabled={isRequesting}
                            icon={<IconEdit className="size-4" />}
                            onClick={() => onEdit(record.name)}
                        />
                        <Button
                            size="small"
                            shape="circle"
                            color="primary"
                            variant="text"
                            disabled={isRequesting}
                            icon={<IconPlayerPlay className="size-4" />}
                            onClick={() => onCommand(record.name, ProjectCommand.启动)}
                        />
                        <Button
                            size="small"
                            shape="circle"
                            color="danger"
                            variant="text"
                            disabled={isRequesting}
                            icon={<IconPlayerStop className="size-4" />}
                            onClick={() => onCommand(record.name, ProjectCommand.停止)}
                        />
                        <Button
                            size="small"
                            shape="circle"
                            color="default"
                            variant="text"
                            disabled={isRequesting}
                            icon={<IconRefresh className="size-4" />}
                            onClick={() => onCommand(record.name, ProjectCommand.重启)}
                        />
                        <Button
                            size="small"
                            shape="circle"
                            color="primary"
                            variant="text"
                            disabled={isRequesting}
                            icon={<IconDownload className="size-4" />}
                            onClick={() => onCommand(record.name, ProjectCommand.拉取)}
                        />
                        <Button
                            size="small"
                            shape="circle"
                            color="default"
                            variant="text"
                            disabled={isRequesting}
                            icon={<IconFileText className="size-4" />}
                            onClick={() => onCommand(record.name, ProjectCommand.日志)}
                        />
                        <Popconfirm title="确认删除项目" description="删除后将无法恢复" onConfirm={() => onDelete(record.name)}>
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
            <title>项目管理</title>
            <div className="flex items-center px-4">
                <div>Docker 项目</div>
                <Button className="ml-auto" color="primary" disabled={isRequesting} onClick={onAdd}>
                    新增项目
                </Button>
            </div>
            <div className="px-4">
                <ProjectLogDrawer name={logName} open={logOpen} content={logContent} onClose={onCloseLog} />
                <Table<ProjectSummary> columns={columns} dataSource={data} loading={isLoading} rowKey="name" pagination={false} />
            </div>
        </div>
    )
}

export default Page
