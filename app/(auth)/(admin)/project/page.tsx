"use client"

import { FC, useRef, useState } from "react"

import { IconDownload, IconEdit, IconFileText, IconPlayerPlay, IconPlayerStop, IconRefresh, IconTrash } from "@tabler/icons-react"
import { Button, DatePicker, Form, Input, Popconfirm, Table } from "antd"
import FormItem from "antd/es/form/FormItem"
import { formatTime, naturalParser, showTotal } from "deepsea-tools"
import { useRouter } from "next/navigation"
import { Columns, getTimeRange, useScroll } from "soda-antd"
import { transformState } from "soda-hooks"
import { useQueryState } from "soda-next"

import { useDeleteProject } from "@/hooks/useDeleteProject"
import { useQueryProject } from "@/hooks/useQueryProject"
import { useRunProject } from "@/hooks/useRunProject"

import { pageNumParser } from "@/schemas/pageNum"
import { pageSizeParser } from "@/schemas/pageSize"
import { ProjectCommand } from "@/schemas/projectCommand"

import { ProjectSummary } from "@/shared/queryProject"

import ProjectLogDrawer from "./_components/ProjectLogDrawer"

const Page: FC = () => {
    const [logOpen, setLogOpen] = useState(false)
    const [logName, setLogName] = useState<string | undefined>(undefined)
    const [logContent, setLogContent] = useState<string | undefined>(undefined)

    const router = useRouter()

    const [query, setQuery] = transformState(
        useQueryState({
            keys: ["name"],
            parse: {
                updatedBefore: naturalParser,
                updatedAfter: naturalParser,
                pageNum: pageNumParser,
                pageSize: pageSizeParser,
            },
        }),
        {
            get({ updatedAfter, updatedBefore, ...rest }) {
                return {
                    updatedAt: getTimeRange(updatedAfter, updatedBefore),
                    ...rest,
                }
            },
            set({ updatedAt, ...rest }) {
                return {
                    updatedAfter: updatedAt?.[0].valueOf(),
                    updatedBefore: updatedAt?.[1].valueOf(),
                    ...rest,
                }
            },
            dependOnGet: false,
        },
    )

    type FormParams = typeof query

    const container = useRef<HTMLDivElement>(null)
    const { y } = useScroll(container, { paginationMargin: 32 })

    const { updatedAt, pageNum, pageSize, ...rest } = query

    const { data, isLoading } = useQueryProject({
        updatedAfter: updatedAt?.[0].toDate(),
        updatedBefore: updatedAt?.[1].toDate(),
        pageNum,
        pageSize,
        ...rest,
    })

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
                            <Button size="small" shape="circle" color="danger" variant="text" disabled={isRequesting} icon={<IconTrash className="size-4" />} />
                        </Popconfirm>
                    </div>
                )
            },
        },
    ]

    return (
        <div className="flex h-full flex-col gap-4 pt-4">
            <title>项目管理</title>
            <div className="flex-none px-4">
                <Form<FormParams> className="gap-y-4" layout="inline" onFinish={setQuery}>
                    <FormItem<FormParams> name="name" label="项目名称">
                        <Input allowClear />
                    </FormItem>
                    <FormItem<FormParams> name="updatedAt" label="更新时间">
                        <DatePicker.RangePicker />
                    </FormItem>
                    <FormItem<FormParams>>
                        <Button htmlType="submit" type="primary" disabled={isRequesting}>
                            查询
                        </Button>
                    </FormItem>
                    <FormItem<FormParams>>
                        <Button htmlType="button" type="text" disabled={isRequesting} onClick={() => setQuery({} as FormParams)}>
                            重置
                        </Button>
                    </FormItem>
                    <Button className="ml-auto" color="primary" disabled={isRequesting} onClick={onAdd}>
                        新增项目
                    </Button>
                </Form>
            </div>
            <div ref={container} className="px-4 fill-y">
                <ProjectLogDrawer name={logName} open={logOpen} content={logContent} onClose={onCloseLog} />
                <Table<ProjectSummary>
                    columns={columns}
                    dataSource={data?.list}
                    loading={isLoading}
                    pagination={{
                        current: pageNum,
                        pageSize,
                        total: data?.total,
                        showTotal,
                        onChange(page, size) {
                            setQuery(prev => ({ ...prev, pageNum: page, pageSize: size }))
                        },
                    }}
                    rowKey="name"
                    scroll={{ y }}
                />
            </div>
        </div>
    )
}

export default Page
