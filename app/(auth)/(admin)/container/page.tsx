"use client"

import { FC, useMemo, useRef, useState } from "react"

import { IconDownload, IconFileText, IconPlayerPause, IconPlayerPlay, IconPlayerStop, IconRefresh, IconTrash } from "@tabler/icons-react"
import { Button, Form, Input, Popconfirm, Select, Table, Tag } from "antd"
import FormItem from "antd/es/form/FormItem"
import { formatTime, showTotal } from "deepsea-tools"
import Link from "next/link"
import { Columns, useScroll } from "soda-antd"
import { useQueryState } from "soda-next"

import DockerContainerStatusSelect from "@/components/DockerContainerStatusSelect"
import ProjectLogDrawer from "@/components/ProjectLogDrawer"

import { DockerContainerStatus } from "@/constants"

import { useQueryDockerContainer } from "@/hooks/useQueryDockerContainer"
import { useRunComposeProject } from "@/hooks/useRunComposeProject"
import { useRunDockerContainer } from "@/hooks/useRunDockerContainer"

import { ComposeProjectCommand } from "@/schemas/composeProjectCommand"
import { DockerContainerCommand } from "@/schemas/dockerContainerCommand"
import { pageNumParser } from "@/schemas/pageNum"
import { pageSizeParser } from "@/schemas/pageSize"

import { DockerContainerItem } from "@/shared/queryDockerContainer"

/** 容器筛选参数 */
export interface ContainerFilterParams {
    name?: string
    image?: string
    status?: DockerContainerStatus
    project?: string
}

/** 容器列表行类型 */
export const DockerContainerRowType = {
    项目: "project",
    容器: "container",
} as const

export type DockerContainerRowType = (typeof DockerContainerRowType)[keyof typeof DockerContainerRowType]

/** Tag 变体枚举 */
export const TagVariant = {
    描边: "outlined",
    实心: "solid",
    填充: "filled",
} as const

export type TagVariant = (typeof TagVariant)[keyof typeof TagVariant]

/** 容器列表表格行数据 */
export interface DockerContainerTableRow {
    id: string
    rowType: DockerContainerRowType
    name: string
    image?: string
    status?: string
    createdAt?: string
    ports?: string
    composeConfigFiles: string[]
    projectId?: string
    projectName?: string
    isManagedProject?: boolean
    containers?: DockerContainerItem[]
}

/** 非平台项目筛选值 */
const unmanagedProjectValue = "__unmanaged"
/** 无项目名筛选值 */
const noProjectValue = "__none"
/** 无项目分组标识 */
const noProjectGroupKey = "__no_project_group__"
/** 无项目容器分组名称 */
const noProjectGroupName = "未归属项目"

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

function normalizeComposeFiles(files: string[]) {
    const items = files.map(item => item.trim()).filter(Boolean)
    return Array.from(new Set(items))
}

function mergeComposeFiles(current: string[], next: string[]) {
    const result = [...normalizeComposeFiles(current)]

    const normalizedNext = normalizeComposeFiles(next)

    normalizedNext.forEach(item => {
        if (!result.includes(item)) result.push(item)
    })

    return result
}

function normalizeName(value?: string) {
    return value?.trim() ?? ""
}

function compareName(first?: string, second?: string) {
    return normalizeName(first).localeCompare(normalizeName(second), "zh-CN", { numeric: true })
}

function getProjectSortWeight(record: DockerContainerTableRow) {
    if (!record.projectName) return 2
    if (record.isManagedProject) return 0
    return 1
}

const Page: FC = () => {
    const [logOpen, setLogOpen] = useState(false)
    const [logName, setLogName] = useState<string | undefined>(undefined)
    const [logContent, setLogContent] = useState<string | undefined>(undefined)

    const { data, isLoading, refetch } = useQueryDockerContainer()
    const { mutateAsync: runDockerContainer, isPending: isRunPending } = useRunDockerContainer()
    const { mutateAsync: runComposeProject, isPending: isRunComposeProjectPending } = useRunComposeProject()

    const isRequesting = isLoading || isRunPending || isRunComposeProjectPending

    const [query, setQuery] = useQueryState({
        keys: ["name", "image", "status", "project"],
        parse: {
            pageNum: pageNumParser,
            pageSize: pageSizeParser,
        },
    })

    type FormParams = typeof query

    const container = useRef<HTMLDivElement>(null)
    const { y } = useScroll(container, { paginationMargin: 32 })

    function onRefresh() {
        refetch()
    }

    function onCloseLog() {
        setLogOpen(false)
        setLogName(undefined)
        setLogContent(undefined)
    }

    async function onCommand(id: string, command: DockerContainerCommand) {
        await runDockerContainer({ id, command })
    }

    async function onProjectCommand(record: DockerContainerTableRow, command: ComposeProjectCommand) {
        if (!record.projectName) return
        if (!record.composeConfigFiles.length) return

        const result = await runComposeProject({ composeFiles: record.composeConfigFiles, command })

        if (command === ComposeProjectCommand.日志) {
            setLogName(record.name)
            setLogContent(result.output)
            setLogOpen(true)
            return
        }

        await refetch()
    }

    function onReset() {
        setQuery({} as FormParams)
    }

    function isProjectRow(record: DockerContainerTableRow) {
        return record.rowType === DockerContainerRowType.项目
    }

    function getProjectStatusSummary(containers?: DockerContainerItem[]) {
        const total = containers?.length ?? 0
        if (!total) return "-"
        const runningCount = getProjectRunningCount(containers)
        return `运行中 ${runningCount} / ${total}`
    }

    function getProjectRunningCount(containers?: DockerContainerItem[]) {
        return (containers ?? []).filter(item => getStatusValue(item.status) === DockerContainerStatus.运行中).length
    }

    function renderProjectTag(label: string, color: string, variant: TagVariant, projectId?: string) {
        const tag = (
            <Tag color={color} variant={variant}>
                {label}
            </Tag>
        )

        if (!projectId) return tag

        return <Link href={`/project?id=${projectId}`}>{tag}</Link>
    }

    function renderPorts(value?: string) {
        if (!value) return "-"

        const items = value
            .split(",")
            .map(item => item.trim())
            .filter(Boolean)

        if (items.length === 0) return "-"
        return items.map((item, index) => (
            <div key={`${item}-${index}`} className="mt-1 first:mt-0">
                <Tag variant={TagVariant.描边} color="green">
                    {item}
                </Tag>
            </div>
        ))
    }

    function renderContainerOperations(id: string) {
        return (
            <div className="inline-flex flex-wrap gap-1">
                <Button
                    size="small"
                    shape="circle"
                    color="orange"
                    variant="text"
                    title="停止"
                    disabled={isRequesting}
                    icon={<IconPlayerStop className="size-4" />}
                    onClick={() => onCommand(id, DockerContainerCommand.停止)}
                />
                <Button
                    size="small"
                    shape="circle"
                    color="yellow"
                    variant="text"
                    title="暂停"
                    disabled={isRequesting}
                    icon={<IconPlayerPause className="size-4" />}
                    onClick={() => onCommand(id, DockerContainerCommand.暂停)}
                />
                <Button
                    size="small"
                    shape="circle"
                    color="cyan"
                    variant="text"
                    title="重启"
                    disabled={isRequesting}
                    icon={<IconRefresh className="size-4" />}
                    onClick={() => onCommand(id, DockerContainerCommand.重启)}
                />
                <Popconfirm title="确认删除容器" description="删除后将无法恢复" onConfirm={() => onCommand(id, DockerContainerCommand.删除)}>
                    <Button
                        size="small"
                        shape="circle"
                        color="danger"
                        variant="text"
                        title="删除"
                        disabled={isRequesting}
                        icon={<IconTrash className="size-4" />}
                    />
                </Popconfirm>
            </div>
        )
    }

    function renderProjectOperations(record: DockerContainerTableRow) {
        if (!record.projectName) return "-"
        const canRunProject = record.composeConfigFiles.length > 0
        const isDisabled = isRequesting || !canRunProject
        const runningCount = getProjectRunningCount(record.containers)
        const isRunning = runningCount > 0

        return (
            <div className="inline-flex flex-wrap gap-1">
                {isRunning ? (
                    <Button
                        size="small"
                        shape="circle"
                        color="orange"
                        variant="text"
                        title="停止"
                        disabled={isDisabled}
                        icon={<IconPlayerStop className="size-4" />}
                        onClick={() => onProjectCommand(record, ComposeProjectCommand.停止)}
                    />
                ) : (
                    <Button
                        size="small"
                        shape="circle"
                        color="green"
                        variant="text"
                        title="启动"
                        disabled={isDisabled}
                        icon={<IconPlayerPlay className="size-4" />}
                        onClick={() => onProjectCommand(record, ComposeProjectCommand.启动)}
                    />
                )}
                <Button
                    size="small"
                    shape="circle"
                    color="cyan"
                    variant="text"
                    title="重启"
                    disabled={isDisabled}
                    icon={<IconRefresh className="size-4" />}
                    onClick={() => onProjectCommand(record, ComposeProjectCommand.重启)}
                />
                <Button
                    size="small"
                    shape="circle"
                    color="blue"
                    variant="text"
                    title="拉取"
                    disabled={isDisabled}
                    icon={<IconDownload className="size-4" />}
                    onClick={() => onProjectCommand(record, ComposeProjectCommand.拉取)}
                />
                <Button
                    size="small"
                    shape="circle"
                    color="purple"
                    variant="text"
                    title="日志"
                    disabled={isDisabled}
                    icon={<IconFileText className="size-4" />}
                    onClick={() => onProjectCommand(record, ComposeProjectCommand.日志)}
                />
                <Popconfirm
                    title="确认删除项目"
                    description="将执行 docker compose down"
                    onConfirm={() => onProjectCommand(record, ComposeProjectCommand.删除)}
                >
                    <Button
                        size="small"
                        shape="circle"
                        color="danger"
                        variant="text"
                        title="删除"
                        disabled={isDisabled}
                        icon={<IconTrash className="size-4" />}
                    />
                </Popconfirm>
            </div>
        )
    }

    const projectOptions = useMemo(() => {
        const projectMap = new Map<string, boolean>()

        ;(data ?? []).forEach(item => {
            const name = item.projectName?.trim()
            if (!name) return
            const isManaged = item.isManagedProject === true

            if (!projectMap.has(name)) {
                projectMap.set(name, isManaged)
                return
            }

            if (isManaged) projectMap.set(name, true)
        })

        const managedProjects: string[] = []

        const unmanagedProjects: string[] = []

        projectMap.forEach((isManaged, name) => {
            if (isManaged) {
                managedProjects.push(name)
                return
            }

            unmanagedProjects.push(name)
        })

        managedProjects.sort(compareName)
        unmanagedProjects.sort(compareName)

        return [
            ...managedProjects.map(item => ({ label: item, value: item })),
            ...unmanagedProjects.map(item => ({ label: item, value: item })),
            { label: "非平台项目", value: unmanagedProjectValue },
            { label: "空", value: noProjectValue },
        ]
    }, [data])

    const filteredData = useMemo(() => {
        const list = data ?? []

        const keywordMap = {
            name: query.name?.trim(),
            image: query.image?.trim(),
            status: query.status?.trim(),
        }

        return list.filter(item => {
            const isNameMatch = keywordMap.name ? item.name.includes(keywordMap.name) : true
            const isImageMatch = keywordMap.image ? item.image.includes(keywordMap.image) : true
            const isStatusMatch = keywordMap.status ? getStatusValue(item.status) === keywordMap.status : true
            const isProjectMatch =
                query.project === unmanagedProjectValue
                    ? !item.isManagedProject
                    : query.project === noProjectValue
                      ? !item.projectName
                      : query.project
                        ? item.projectName === query.project
                        : true

            return isNameMatch && isImageMatch && isStatusMatch && isProjectMatch
        })
    }, [data, query.image, query.name, query.project, query.status])

    const tableRows = useMemo(() => {
        const rows: DockerContainerTableRow[] = []

        const projectMap = new Map<string, DockerContainerTableRow>()

        // 按项目分组，未归属项目的容器归为同一组
        filteredData.forEach(item => {
            const groupKey = item.projectName ?? noProjectGroupKey
            const groupName = item.projectName ?? noProjectGroupName
            const cached = projectMap.get(groupKey)

            if (cached) {
                cached.containers?.push(item)
                cached.composeConfigFiles = mergeComposeFiles(cached.composeConfigFiles, item.composeConfigFiles)
                if (!cached.projectId && item.projectId) cached.projectId = item.projectId
                return
            }

            const row: DockerContainerTableRow = {
                id: `project:${groupKey}`,
                rowType: DockerContainerRowType.项目,
                name: groupName,
                composeConfigFiles: normalizeComposeFiles(item.composeConfigFiles),
                projectId: item.projectId,
                projectName: item.projectName,
                isManagedProject: item.projectName ? item.isManagedProject : false,
                containers: [item],
            }

            projectMap.set(groupKey, row)
            rows.push(row)
        })

        const sortedRows = rows.map(row => ({
            ...row,
            containers: row.containers ? [...row.containers].sort((first, second) => compareName(first.name, second.name)) : row.containers,
        }))

        sortedRows.sort((first, second) => {
            const weightDiff = getProjectSortWeight(first) - getProjectSortWeight(second)
            if (weightDiff !== 0) return weightDiff
            return compareName(first.name, second.name)
        })

        return sortedRows
    }, [filteredData])

    const pagedData = useMemo(() => {
        const pageNum = query.pageNum ?? 1
        const pageSize = query.pageSize ?? 10
        const start = (pageNum - 1) * pageSize
        const end = start + pageSize
        return tableRows.slice(start, end)
    }, [query.pageNum, query.pageSize, tableRows])

    const columns: Columns<DockerContainerTableRow> = [
        {
            title: "名称",
            dataIndex: "name",
            align: "left",
            render(value: string, record) {
                if (!isProjectRow(record)) return value
                return (
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{value}</span>
                    </div>
                )
            },
        },
        {
            title: "项目归属",
            dataIndex: "isManagedProject",
            align: "center",
            render(value: boolean | undefined, record) {
                if (isProjectRow(record) && !record.projectName) return <Tag>无项目</Tag>
                if (!isProjectRow(record) && !record.projectName) return "-"
                if (value === true) return renderProjectTag("平台项目", "geekblue", TagVariant.实心, record.projectId)
                if (value === false) return renderProjectTag("非平台项目", "orange", TagVariant.填充)
                return "-"
            },
        },
        {
            title: "状态",
            dataIndex: "status",
            align: "center",
            render(value: string | undefined, record) {
                if (isProjectRow(record)) return getProjectStatusSummary(record.containers)
                return value || "-"
            },
        },
        {
            title: "操作",
            key: "operation",
            align: "center",
            render(value, record) {
                if (isProjectRow(record)) return renderProjectOperations(record)
                return renderContainerOperations(record.id)
            },
        },
    ]

    const containerColumns: Columns<DockerContainerItem> = [
        {
            title: "容器名称",
            dataIndex: "name",
            align: "left",
        },
        {
            title: "容器 ID",
            dataIndex: "id",
            align: "center",
        },
        {
            title: "镜像",
            dataIndex: "image",
            align: "center",
            render(value: string | undefined) {
                return value || "-"
            },
        },
        {
            title: "状态",
            dataIndex: "status",
            align: "center",
            render(value: string | undefined) {
                return value || "-"
            },
        },
        {
            title: "创建时间",
            dataIndex: "createdAt",
            align: "center",
            render(value: string | undefined) {
                return value ? formatTime(value) : "-"
            },
        },
        {
            title: "端口",
            dataIndex: "ports",
            align: "center",
            render(value: string | undefined) {
                return renderPorts(value)
            },
        },
        {
            title: "操作",
            key: "operation",
            align: "center",
            render(value, record) {
                return renderContainerOperations(record.id)
            },
        },
    ]

    return (
        <div className="flex h-full flex-col gap-4 pt-4">
            <title>容器管理</title>
            <div className="flex-none px-4">
                <Form<FormParams> className="gap-y-4" layout="inline" onFinish={setQuery}>
                    <FormItem<FormParams> name="name" label="容器名称">
                        <Input />
                    </FormItem>
                    <FormItem<FormParams> name="image" label="镜像">
                        <Input />
                    </FormItem>
                    <FormItem<FormParams> name="status" label="状态">
                        <DockerContainerStatusSelect allowClear placeholder="选择状态" />
                    </FormItem>
                    <FormItem<FormParams> name="project" label="项目">
                        <Select className="!w-48" allowClear options={projectOptions} placeholder="选择项目" />
                    </FormItem>
                    <FormItem<FormParams>>
                        <Button disabled={isRequesting} htmlType="submit" type="primary">
                            查询
                        </Button>
                    </FormItem>
                    <FormItem<FormParams>>
                        <Button disabled={isRequesting} htmlType="button" type="text" onClick={onReset}>
                            重置
                        </Button>
                    </FormItem>
                    <Button className="ml-auto" color="primary" disabled={isRequesting} onClick={onRefresh}>
                        刷新
                    </Button>
                </Form>
            </div>
            <div ref={container} className="px-4 fill-y">
                <ProjectLogDrawer name={logName} open={logOpen} content={logContent} onClose={onCloseLog} />
                <Table<DockerContainerTableRow>
                    rowKey="id"
                    scroll={{ y }}
                    columns={columns}
                    dataSource={pagedData}
                    loading={isLoading}
                    pagination={{
                        current: query.pageNum,
                        pageSize: query.pageSize,
                        showTotal,
                        total: tableRows.length,
                        onChange(page, size) {
                            setQuery(prev => ({ ...prev, pageNum: page, pageSize: size }))
                        },
                    }}
                    expandable={{
                        expandedRowRender(record) {
                            const containers = record.containers ?? []
                            if (!containers.length) return null
                            return (
                                <div className="py-2">
                                    <Table<DockerContainerItem>
                                        rowKey="id"
                                        size="small"
                                        columns={containerColumns}
                                        dataSource={containers}
                                        pagination={false}
                                    />
                                </div>
                            )
                        },
                        rowExpandable(record) {
                            return isProjectRow(record) && !!record.containers?.length
                        },
                    }}
                />
            </div>
        </div>
    )
}

export default Page
