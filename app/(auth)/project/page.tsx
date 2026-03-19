"use client"

import { FC, useEffect, useMemo, useRef, useState } from "react"

import { IconCopy, IconDownload, IconEdit, IconFileText, IconPlayerPlay, IconPlayerStop, IconRefresh, IconTrash } from "@tabler/icons-react"
import { Button, DatePicker, Form, Input, Modal, Table, TableProps, Tabs } from "antd"
import { useForm } from "antd/es/form/Form"
import FormItem from "antd/es/form/FormItem"
import { clsx, formatTime, naturalParser, showTotal } from "deepsea-tools"
import { useRouter } from "next/navigation"
import { Columns, getTimeRange, useScroll } from "soda-antd"
import { transformState } from "soda-hooks"
import { useQueryState } from "soda-next"

import ProjectLogDrawer from "@/components/ProjectLogDrawer"

import { DockerContainerStatus } from "@/constants"

import { useCheckProjectStart } from "@/hooks/useCheckProjectStart"
import { useDeleteProject } from "@/hooks/useDeleteProject"
import { useQueryDockerContainer } from "@/hooks/useQueryDockerContainer"
import { useQueryProject } from "@/hooks/useQueryProject"
import { useRunProject } from "@/hooks/useRunProject"

import { getParser } from "@/schemas"
import { CheckProjectStartResult, ProjectStartMountItem, ProjectStartMountStatus } from "@/schemas/checkProjectStart"
import { pageNumParser } from "@/schemas/pageNum"
import { pageSizeParser } from "@/schemas/pageSize"
import { ProjectCommand } from "@/schemas/projectCommand"
import { ProjectSortByParams, projectSortBySchema } from "@/schemas/projectSortBy"
import { sortOrderSchema } from "@/schemas/sortOrder"

import { DockerContainerItem } from "@/shared/queryDockerContainer"
import { ProjectSummary } from "@/shared/queryProject"

import { getSortOrder } from "@/utils/getSortOrder"

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

/** 项目启动预检查状态 */
export interface ProjectStartCheckState {
    name?: string
    data?: CheckProjectStartResult
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

function getStartCheckStatusText(status: ProjectStartMountStatus) {
    if (status === ProjectStartMountStatus.已存在) return "已存在"
    if (status === ProjectStartMountStatus.将创建) return "将自动创建"
    return "不可创建"
}

function getStartCheckStatusClassName(status: ProjectStartMountStatus) {
    if (status === ProjectStartMountStatus.已存在) return "border-emerald-200 bg-emerald-50 text-emerald-700"
    if (status === ProjectStartMountStatus.将创建) return "border-sky-200 bg-sky-50 text-sky-700"
    return "border-red-200 bg-red-50 text-red-700"
}

function onRenderMountItem(item: ProjectStartMountItem) {
    const isSamePath = item.sourcePath === item.resolvedPath

    return (
        <div key={item.resolvedPath} className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-slate-900">{item.sourcePath}</div>
                    {!isSamePath ? <div className="mt-1 break-all text-xs text-slate-500">实际路径：{item.resolvedPath}</div> : null}
                    <div className="mt-1 text-xs text-slate-500">{item.message || "-"}</div>
                </div>
                <div className={clsx("flex-none rounded-full border px-2 py-1 text-xs font-medium", getStartCheckStatusClassName(item.status))}>
                    {getStartCheckStatusText(item.status)}
                </div>
            </div>
        </div>
    )
}

const Page: FC = () => {
    const [logOpen, setLogOpen] = useState(false)
    const [logName, setLogName] = useState<string | undefined>(undefined)
    const [logContent, setLogContent] = useState<string | undefined>(undefined)
    const [deleteOpen, setDeleteOpen] = useState(false)
    const [deleteName, setDeleteName] = useState<string | undefined>(undefined)
    const [deleteMode, setDeleteMode] = useState<ProjectDeleteMode>(ProjectDeleteMode.仅删除项目)
    const [startCheckOpen, setStartCheckOpen] = useState(false)
    const [startCheck, setStartCheck] = useState<ProjectStartCheckState>({})

    const router = useRouter()

    const [query, setQuery] = transformState(
        useQueryState({
            keys: ["name", "xName", "contentKeyword"],
            parse: {
                createdBefore: naturalParser,
                createdAfter: naturalParser,
                updatedBefore: naturalParser,
                updatedAfter: naturalParser,
                pageNum: pageNumParser,
                pageSize: pageSizeParser,
                sortBy: getParser(projectSortBySchema.optional().catch(undefined)),
                sortOrder: getParser(sortOrderSchema.optional().catch(undefined)),
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

    const [form] = useForm<FormParams>()

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

    const { mutateAsync: checkProjectStart, isPending: isCheckProjectStartPending } = useCheckProjectStart()
    const { mutateAsync: deleteProject, isPending: isDeletePending } = useDeleteProject()
    const { mutateAsync: runProject, isPending: isRunPending } = useRunProject()

    const isRequesting = isLoading || isCheckProjectStartPending || isDeletePending || isRunPending

    useEffect(() => {
        form.resetFields()

        form.setFieldsValue({
            name: query.name,
            xName: query.xName,
            contentKeyword: query.contentKeyword,
            createdAt: query.createdAt,
            updatedAt: query.updatedAt,
        })
    }, [form, query])

    function onAdd() {
        router.push("/project/editor")
    }

    function onEdit(name: string) {
        router.push(`/project/editor?name=${encodeURIComponent(name)}`)
    }

    function onClickCopy(name: string) {
        router.push(`/project/editor?copyFrom=${encodeURIComponent(name)}`)
    }

    function onReset() {
        form.resetFields()
        setQuery({} as FormParams)
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

    function onCloseStartCheck() {
        if (isRunPending) return
        setStartCheckOpen(false)
        setStartCheck({})
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
        if (command === ProjectCommand.启动) {
            setStartCheckOpen(true)

            setStartCheck({
                name,
            })

            try {
                const data = await checkProjectStart({ name })

                setStartCheck({
                    name,
                    data,
                })
            } catch (error) {
                setStartCheckOpen(false)
                setStartCheck({})
                throw error
            }

            return
        }

        const result = await runProject({ name, command })
        if (command !== ProjectCommand.日志) return
        setLogName(name)
        setLogContent(result.output)
        setLogOpen(true)
    }

    async function onConfirmStart() {
        const name = startCheck.name?.trim()
        if (!name) return

        await runProject({
            name,
            command: ProjectCommand.启动,
        })

        onCloseStartCheck()
    }

    function onDeleteLabel(mode: ProjectDeleteMode, label: string) {
        return <span className={clsx("text-sm", deleteMode === mode ? "text-red-500" : "text-slate-600")}>{label}</span>
    }

    const onTableChange: TableProps<ProjectSummary>["onChange"] = function onTableChange(pagination, filters, sorter) {
        if (Array.isArray(sorter)) return

        const sortBy = (typeof sorter.columnKey === "string" ? sorter.columnKey : typeof sorter.field === "string" ? sorter.field : undefined) ?? undefined

        setQuery(prev => ({
            ...prev,
            pageNum: pagination.current ?? prev.pageNum,
            pageSize: pagination.pageSize ?? prev.pageSize,
            sortBy: sortBy as ProjectSortByParams | undefined,
            sortOrder: getSorterOrder(sorter.order),
        }))
    }

    const projectStatusMap = useMemo(() => getProjectContainerStatusMap(containerData ?? []), [containerData])

    const columns: Columns<ProjectSummary> = [
        {
            title: "项目名称",
            dataIndex: "displayName",
            key: "xName",
            align: "center",
            sorter: true,
            sortOrder: getSortOrder(query, "xName"),
            render(value, record) {
                return value || record.name
            },
        },
        {
            title: "英文名称",
            dataIndex: "name",
            key: "name",
            align: "center",
            width: 220,
            ellipsis: true,
            sorter: true,
            sortOrder: getSortOrder(query, "name"),
            render(value) {
                return value || "-"
            },
        },
        {
            title: "项目描述",
            dataIndex: "description",
            align: "center",
            width: 280,
            ellipsis: true,
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
            sorter: true,
            sortOrder: getSortOrder(query, "createdAt"),
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
            sorter: true,
            sortOrder: getSortOrder(query, "updatedAt"),
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
                <Form<FormParams> name="query-project-form" form={form} className="gap-y-4" layout="inline" onFinish={setQuery}>
                    <FormItem<FormParams> name="name" label="英文名称">
                        <Input allowClear />
                    </FormItem>
                    <FormItem<FormParams> name="xName" label="项目名称">
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
                        <Button htmlType="button" type="text" disabled={isRequesting} onClick={onReset}>
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
                    mask={{ closable: !isDeletePending }}
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
                <Modal
                    title={startCheck.name ? `启动预检查：${startCheck.name}` : "启动预检查"}
                    open={startCheckOpen}
                    okText="确认启动"
                    cancelText="取消"
                    mask={{ closable: !isRunPending && !isCheckProjectStartPending }}
                    okButtonProps={{
                        disabled: !startCheck.name || !startCheck.data?.canStart || isCheckProjectStartPending,
                        loading: isRunPending,
                    }}
                    cancelButtonProps={{
                        disabled: isRunPending || isCheckProjectStartPending,
                    }}
                    onOk={onConfirmStart}
                    onCancel={onCloseStartCheck}
                >
                    {isCheckProjectStartPending ? (
                        <div className="py-6 text-sm text-slate-600">正在检查挂载目录...</div>
                    ) : (
                        <div className="space-y-3">
                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                                <div>已存在目录：{startCheck.data?.existsCount ?? 0}</div>
                                <div>将自动创建：{startCheck.data?.createCount ?? 0}</div>
                                <div className={clsx((startCheck.data?.blockedCount ?? 0) > 0 ? "text-red-600" : "text-slate-700")}>
                                    不可创建：{startCheck.data?.blockedCount ?? 0}
                                </div>
                            </div>
                            {(startCheck.data?.items.length ?? 0) > 0 ? (
                                <div className="max-h-80 space-y-2 overflow-auto pr-1">{startCheck.data?.items.map(onRenderMountItem)}</div>
                            ) : (
                                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                                    未检测到需要自动处理的挂载目录
                                </div>
                            )}
                            {startCheck.data && !startCheck.data.canStart ? (
                                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                                    存在不可创建的挂载目录，请先修复后再启动项目
                                </div>
                            ) : null}
                        </div>
                    )}
                </Modal>
                <Table<ProjectSummary>
                    columns={columns}
                    dataSource={data?.list}
                    loading={isLoading}
                    onChange={onTableChange}
                    pagination={{
                        current: pageNum,
                        pageSize,
                        total: data?.total,
                        showTotal,
                    }}
                    rowKey="name"
                    scroll={{ y }}
                />
            </div>
        </div>
    )
}

function getSorterOrder(order?: string | null) {
    if (order === "ascend") return "asc"
    if (order === "descend") return "desc"
    return undefined
}

export default Page
