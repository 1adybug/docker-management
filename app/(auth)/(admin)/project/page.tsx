"use client"

import { FC, useMemo, useRef, useState } from "react"

import { IconCopy, IconDownload, IconEdit, IconFileText, IconPlayerPlay, IconPlayerStop, IconRefresh, IconTrash } from "@tabler/icons-react"
import { Button, DatePicker, Form, Input, Modal, Table, Tabs } from "antd"
import FormItem from "antd/es/form/FormItem"
import { clsx, formatTime, naturalParser, showTotal } from "deepsea-tools"
import { useRouter } from "next/navigation"
import { Columns, getTimeRange, useScroll } from "soda-antd"
import { transformState } from "soda-hooks"
import { useQueryState } from "soda-next"

import ProjectLogDrawer from "@/components/ProjectLogDrawer"

import { DockerContainerStatus } from "@/constants"

import { useDeleteProject } from "@/hooks/useDeleteProject"
import { useQueryDockerContainer } from "@/hooks/useQueryDockerContainer"
import { useQueryProject } from "@/hooks/useQueryProject"
import { useRunProject } from "@/hooks/useRunProject"

import { pageNumParser } from "@/schemas/pageNum"
import { pageSizeParser } from "@/schemas/pageSize"
import { ProjectCommand } from "@/schemas/projectCommand"

import { DockerContainerItem } from "@/shared/queryDockerContainer"
import { ProjectSummary } from "@/shared/queryProject"

/** 项目删除方式 */
export const ProjectDeleteMode = {
    仅删除项目: "only-delete",
    删除并清理容器: "delete-and-cleanup",
} as const

export type ProjectDeleteMode = (typeof ProjectDeleteMode)[keyof typeof ProjectDeleteMode]

/** 项目容器状态统计 */
export interface ProjectContainerStatusSummary {
    runningCount: number
    total: number
}

/** 项目容器状态映射 */
export interface ProjectContainerStatusMap {
    [key: string]: ProjectContainerStatusSummary
}

/** 解析容器状态 */
function getStatusValue(status?: string) {
    const value = status?.toLowerCase() ?? ""
    if (value.includes("up")) return DockerContainerStatus.运行中
    if (value.includes("exited")) return DockerContainerStatus.已退出
    if (value.includes("restarting")) return DockerContainerStatus.重启中
    if (value.includes("paused")) return DockerContainerStatus.已暂停
    if (value.includes("created")) return DockerContainerStatus.已创建
    if (value.includes("dead")) return DockerContainerStatus.已失效
    return DockerContainerStatus.其他
}

function getProjectContainerStatusMap(containers?: DockerContainerItem[]) {
    const map: ProjectContainerStatusMap = {}

    ;(containers ?? []).forEach(item => {
        if (item.isManagedProject !== true) return
        const projectName = item.projectName
        if (!projectName) return
        const current = map[projectName] ?? { runningCount: 0, total: 0 }
        const isRunning = getStatusValue(item.status) === DockerContainerStatus.运行中
        map[projectName] = {
            runningCount: current.runningCount + (isRunning ? 1 : 0),
            total: current.total + 1,
        }
    })

    return map
}

const Page: FC = () => {
    const [logOpen, setLogOpen] = useState(false)
    const [logName, setLogName] = useState<string | undefined>(undefined)
    const [logContent, setLogContent] = useState<string | undefined>(undefined)
    const [deleteOpen, setDeleteOpen] = useState(false)
    const [deleteName, setDeleteName] = useState<string | undefined>(undefined)
    const [deleteMode, setDeleteMode] = useState<ProjectDeleteMode>(ProjectDeleteMode.仅删除项目)

    const router = useRouter()

    const [query, setQuery] = transformState(
        useQueryState({
            keys: ["name", "contentKeyword"],
            parse: {
                createdBefore: naturalParser,
                createdAfter: naturalParser,
                updatedBefore: naturalParser,
                updatedAfter: naturalParser,
                pageNum: pageNumParser,
                pageSize: pageSizeParser,
            },
        }),
        {
            get({ createdAfter, createdBefore, updatedAfter, updatedBefore, ...rest }) {
                return {
                    createdAt: getTimeRange(createdAfter, createdBefore),
                    updatedAt: getTimeRange(updatedAfter, updatedBefore),
                    ...rest,
                }
            },
            set({ createdAt, updatedAt, ...rest }) {
                return {
                    createdAfter: createdAt?.[0].valueOf(),
                    createdBefore: createdAt?.[1].valueOf(),
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

    const { createdAt, updatedAt, pageNum, pageSize, ...rest } = query

    const { data, isLoading } = useQueryProject({
        createdAfter: createdAt?.[0].toDate(),
        createdBefore: createdAt?.[1].toDate(),
        updatedAfter: updatedAt?.[0].toDate(),
        updatedBefore: updatedAt?.[1].toDate(),
        pageNum,
        pageSize,
        ...rest,
    })

    const { data: containerData } = useQueryDockerContainer()

    const { mutateAsync: deleteProject, isPending: isDeletePending } = useDeleteProject()
    const { mutateAsync: runProject, isPending: isRunPending } = useRunProject()

    const isRequesting = isLoading || isDeletePending || isRunPending

    function onAdd() {
        router.push("/project/editor")
    }

    function onEdit(name: string) {
        router.push(`/project/editor?name=${encodeURIComponent(name)}`)
    }

    function onClickCopy(name: string) {
        router.push(`/project/editor?copyFrom=${encodeURIComponent(name)}`)
    }

    function onCloseLog() {
        setLogOpen(false)
        setLogName(undefined)
        setLogContent(undefined)
    }

    function onOpenDelete(name: string) {
        setDeleteName(name)
        setDeleteMode(ProjectDeleteMode.仅删除项目)
        setDeleteOpen(true)
    }

    function onCloseDelete() {
        setDeleteOpen(false)
        setDeleteName(undefined)
    }

    async function onDeleteConfirm() {
        if (!deleteName) return
        await deleteProject({
            name: deleteName,
            cleanup: deleteMode === ProjectDeleteMode.删除并清理容器,
        })
        onCloseDelete()
    }

    function onDeleteModeChange(key: string) {
        if (key === ProjectDeleteMode.仅删除项目 || key === ProjectDeleteMode.删除并清理容器) setDeleteMode(key)
    }

    async function onCommand(name: string, command: ProjectCommand) {
        const result = await runProject({ name, command })
        if (command !== ProjectCommand.日志) return
        setLogName(name)
        setLogContent(result.output)
        setLogOpen(true)
    }

    function onDeleteLabel(mode: ProjectDeleteMode, label: string) {
        return <span className={clsx("text-sm", deleteMode === mode ? "text-red-500" : "text-slate-600")}>{label}</span>
    }

    const projectStatusMap = useMemo(() => getProjectContainerStatusMap(containerData ?? []), [containerData])

    const columns: Columns<ProjectSummary> = [
        {
            title: "项目名称",
            dataIndex: "name",
            align: "center",
        },
        {
            title: "创建用户",
            dataIndex: "createdUser",
            align: "center",
            render(value) {
                return value || "-"
            },
        },
        {
            title: "创建时间",
            dataIndex: "createdAt",
            align: "center",
            render(value) {
                return formatTime(value)
            },
        },
        {
            title: "更新用户",
            dataIndex: "updatedUser",
            align: "center",
            render(value) {
                return value || "-"
            },
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
                            color="geekblue"
                            variant="text"
                            title="编辑"
                            disabled={isRequesting}
                            icon={<IconEdit className="size-4" />}
                            onClick={() => onEdit(record.name)}
                        />
                        <Button
                            size="small"
                            shape="circle"
                            color="magenta"
                            variant="text"
                            title="复制"
                            disabled={isRequesting}
                            icon={<IconCopy className="size-4" />}
                            onClick={() => onClickCopy(record.name)}
                        />
                        {(projectStatusMap[record.name]?.runningCount ?? 0) > 0 ? (
                            <Button
                                size="small"
                                shape="circle"
                                color="orange"
                                variant="text"
                                title="停止"
                                disabled={isRequesting}
                                icon={<IconPlayerStop className="size-4" />}
                                onClick={() => onCommand(record.name, ProjectCommand.停止)}
                            />
                        ) : (
                            <Button
                                size="small"
                                shape="circle"
                                color="green"
                                variant="text"
                                title="启动"
                                disabled={isRequesting}
                                icon={<IconPlayerPlay className="size-4" />}
                                onClick={() => onCommand(record.name, ProjectCommand.启动)}
                            />
                        )}
                        <Button
                            size="small"
                            shape="circle"
                            color="cyan"
                            variant="text"
                            title="重启"
                            disabled={isRequesting}
                            icon={<IconRefresh className="size-4" />}
                            onClick={() => onCommand(record.name, ProjectCommand.重启)}
                        />
                        <Button
                            size="small"
                            shape="circle"
                            color="blue"
                            variant="text"
                            title="拉取"
                            disabled={isRequesting}
                            icon={<IconDownload className="size-4" />}
                            onClick={() => onCommand(record.name, ProjectCommand.拉取)}
                        />
                        <Button
                            size="small"
                            shape="circle"
                            color="purple"
                            variant="text"
                            title="日志"
                            disabled={isRequesting}
                            icon={<IconFileText className="size-4" />}
                            onClick={() => onCommand(record.name, ProjectCommand.日志)}
                        />
                        <Button
                            size="small"
                            shape="circle"
                            color="danger"
                            variant="text"
                            title="删除"
                            disabled={isRequesting}
                            icon={<IconTrash className="size-4" />}
                            onClick={() => onOpenDelete(record.name)}
                        />
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
                    <FormItem<FormParams> name="contentKeyword" label="内容关键字">
                        <Input allowClear />
                    </FormItem>
                    <FormItem<FormParams> name="createdAt" label="创建时间">
                        <DatePicker.RangePicker />
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
                <Modal
                    title={deleteName ? `删除项目：${deleteName}` : "删除项目"}
                    open={deleteOpen}
                    okText={deleteMode === ProjectDeleteMode.删除并清理容器 ? "删除并清理" : "删除"}
                    cancelText="取消"
                    maskClosable={!isDeletePending}
                    okButtonProps={{ danger: true, disabled: !deleteName, loading: isDeletePending }}
                    cancelButtonProps={{ disabled: isDeletePending }}
                    onOk={onDeleteConfirm}
                    onCancel={onCloseDelete}
                >
                    <Tabs
                        activeKey={deleteMode}
                        items={[
                            {
                                key: ProjectDeleteMode.仅删除项目,
                                label: onDeleteLabel(ProjectDeleteMode.仅删除项目, "仅删除项目"),
                                children: <div className="text-sm text-slate-600">仅删除数据库记录与本地项目目录，容器保持运行</div>,
                            },
                            {
                                key: ProjectDeleteMode.删除并清理容器,
                                label: onDeleteLabel(ProjectDeleteMode.删除并清理容器, "删除项目并清理容器"),
                                children: <div className="text-sm text-slate-600">会先执行 docker compose down，再删除数据库记录与本地项目目录</div>,
                            },
                        ]}
                        onChange={onDeleteModeChange}
                    />
                </Modal>
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
