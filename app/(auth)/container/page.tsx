"use client"

import { FC, useEffect, useMemo, useRef, useState } from "react"

import {
    IconCode,
    IconDownload,
    IconFileText,
    IconMinus,
    IconPlayerPause,
    IconPlayerPlay,
    IconPlayerStop,
    IconPlus,
    IconRefresh,
    IconTrash,
} from "@tabler/icons-react"
import { Button, Form, Input, Popconfirm, Select, Table, TableProps, Tag } from "antd"
import { useForm } from "antd/es/form/Form"
import FormItem from "antd/es/form/FormItem"
import { formatTime, showTotal } from "deepsea-tools"
import Link from "next/link"
import { Columns, useScroll } from "soda-antd"
import { useQueryState } from "soda-next"

import DockerContainerStatusSelect from "@/components/DockerContainerStatusSelect"
import ProjectLogDrawer from "@/components/ProjectLogDrawer"

import { DockerContainerStatus } from "@/constants"

import { useQueryDockerContainer } from "@/hooks/useQueryDockerContainer"
import { useReadComposeProject } from "@/hooks/useReadComposeProject"
import { useRunComposeProject } from "@/hooks/useRunComposeProject"
import { useRunDockerContainer } from "@/hooks/useRunDockerContainer"

import { getParser } from "@/schemas"
import { ComposeProjectCommand } from "@/schemas/composeProjectCommand"
import { DockerContainerChildSortByParams, dockerContainerChildSortBySchema } from "@/schemas/dockerContainerChildSortBy"
import { DockerContainerCommand } from "@/schemas/dockerContainerCommand"
import { DockerContainerSortByParams, dockerContainerSortBySchema } from "@/schemas/dockerContainerSortBy"
import { pageNumParser } from "@/schemas/pageNum"
import { pageSizeParser } from "@/schemas/pageSize"
import { SortOrderParams, sortOrderSchema } from "@/schemas/sortOrder"

import type { DockerContainerItem } from "@/shared/queryDockerContainer"
import type { ComposeProjectFile } from "@/shared/readComposeProject"

import { getSortOrder } from "@/utils/getSortOrder"

/** 容器筛选参数 */
export interface ContainerFilterParams {
    name?: string
    image?: string
    status?: DockerContainerStatus
    project?: string
}

/** 容器列表查询参数 */
export interface ContainerTableQuery extends ContainerFilterParams {
    pageNum?: number
    pageSize?: number
    sortBy?: DockerContainerSortByParams
    sortOrder?: SortOrderParams
    childSortBy?: DockerContainerChildSortByParams
    childSortOrder?: SortOrderParams
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

/** 容器端口展示项 */
export interface DockerContainerPortTag {
    label: string
    hostPort?: string
}

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
    projectDisplayName?: string
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

function getProjectLabel(record: DockerContainerTableRow) {
    return record.projectDisplayName ?? record.projectName ?? noProjectGroupName
}

function getCreatedAtTimestamp(value?: string) {
    const timestamp = Date.parse(value ?? "")
    return Number.isNaN(timestamp) ? undefined : timestamp
}

function compareOptionalNumber(first?: number, second?: number) {
    if (first === undefined && second === undefined) return 0
    if (first === undefined) return 1
    if (second === undefined) return -1
    return first - second
}

function compareCreatedAt(first?: string, second?: string) {
    const timestampDiff = compareOptionalNumber(getCreatedAtTimestamp(first), getCreatedAtTimestamp(second))
    if (timestampDiff !== 0) return timestampDiff
    return compareName(first, second)
}

function compareContainerStatus(first?: string, second?: string) {
    const statusDiff = compareName(getStatusValue(first), getStatusValue(second))
    if (statusDiff !== 0) return statusDiff
    return compareName(first, second)
}

function compareProject(record: DockerContainerTableRow, nextRecord: DockerContainerTableRow) {
    const projectDiff = getProjectSortWeight(record) - getProjectSortWeight(nextRecord)
    if (projectDiff !== 0) return projectDiff
    return compareName(getProjectLabel(record), getProjectLabel(nextRecord))
}

function getSortResult(result: number, sortOrder?: SortOrderParams) {
    return sortOrder === "desc" ? result * -1 : result
}

function compareTableRow(first: DockerContainerTableRow, second: DockerContainerTableRow, sortBy?: DockerContainerSortByParams) {
    switch (sortBy) {
        case "name":
            return compareName(first.name, second.name) || compareProject(first, second)
        case "project":
            return compareProject(first, second) || compareName(first.name, second.name)
        default:
            return compareProject(first, second) || compareName(first.name, second.name)
    }
}

function compareContainerItem(first: DockerContainerItem, second: DockerContainerItem, sortBy?: DockerContainerChildSortByParams) {
    switch (sortBy) {
        case "id":
            return compareName(first.id, second.id) || compareName(first.name, second.name)
        case "image":
            return compareName(first.image, second.image) || compareName(first.name, second.name)
        case "status":
            return compareContainerStatus(first.status, second.status) || compareName(first.name, second.name)
        case "createdAt":
            return compareCreatedAt(first.createdAt, second.createdAt) || compareName(first.name, second.name)
        case "name":
        default:
            return compareName(first.name, second.name) || compareName(first.id, second.id)
    }
}

function getSorterOrder(order?: string | null) {
    if (order === "ascend") return "asc"
    if (order === "descend") return "desc"
    return undefined
}

function getDockerContainerPortTags(value?: string) {
    if (!value) return []

    return value
        .split(",")
        .map(item => item.trim())
        .filter(Boolean)
        .map(item => ({
            label: item,
            hostPort: getDockerContainerAccessiblePort(item),
        }))
}

function getDockerContainerAccessiblePort(value: string) {
    const matched = value.match(/^(.*):(\d+)\s*->\s*(\d+(?:-\d+)?)\/([a-z0-9]+)$/iu)

    if (!matched) return undefined

    const [, host, hostPort, , protocol] = matched

    if (protocol.toLowerCase() !== "tcp") return undefined
    if (isDockerContainerLocalHostBinding(host)) return undefined

    return hostPort
}

function isDockerContainerLocalHostBinding(value: string) {
    const host = value.trim().toLowerCase()

    return host === "127.0.0.1" || host === "localhost" || host === "::1" || host === "[::1]"
}

function getImageHref(name?: string) {
    const imageName = name?.trim()
    if (!imageName) return "/image"
    return `/image?name=${encodeURIComponent(imageName)}`
}

const Page: FC = () => {
    const [logOpen, setLogOpen] = useState(false)
    const [logName, setLogName] = useState<string | undefined>(undefined)
    const [logContent, setLogContent] = useState<string | undefined>(undefined)
    const [logTitleSuffix, setLogTitleSuffix] = useState("日志")
    const [logEmptyDescription, setLogEmptyDescription] = useState("暂无日志")

    const { data, isLoading, refetch } = useQueryDockerContainer()
    const { mutateAsync: readComposeProject, isPending: isReadComposeProjectPending } = useReadComposeProject()
    const { mutateAsync: runDockerContainer, isPending: isRunPending } = useRunDockerContainer()
    const { mutateAsync: runComposeProject, isPending: isRunComposeProjectPending } = useRunComposeProject()

    const isRequesting = isLoading || isReadComposeProjectPending || isRunPending || isRunComposeProjectPending

    const [query, setQuery] = useQueryState({
        keys: ["name", "image", "status", "project"],
        parse: {
            pageNum: pageNumParser,
            pageSize: pageSizeParser,
            sortBy: getParser(dockerContainerSortBySchema.optional().catch(undefined)),
            sortOrder: getParser(sortOrderSchema.optional().catch(undefined)),
            childSortBy: getParser(dockerContainerChildSortBySchema.optional().catch(undefined)),
            childSortOrder: getParser(sortOrderSchema.optional().catch(undefined)),
        },
    })

    type FormParams = ContainerTableQuery

    const [form] = useForm<FormParams>()

    const container = useRef<HTMLDivElement>(null)
    const { y } = useScroll(container, { paginationMargin: 32 })
    const pageNum = query.pageNum ?? 1
    const pageSize = query.pageSize ?? 10

    useEffect(() => {
        form.resetFields()

        form.setFieldsValue({
            name: query.name,
            image: query.image,
            status: query.status as DockerContainerStatus | undefined,
            project: query.project,
        })
    }, [form, query])

    function onRefresh() {
        refetch()
    }

    function onCloseLog() {
        setLogOpen(false)
        setLogName(undefined)
        setLogContent(undefined)
        setLogTitleSuffix("日志")
        setLogEmptyDescription("暂无日志")
    }

    async function onCommand(id: string, command: DockerContainerCommand) {
        await runDockerContainer({ id, command })
    }

    function hasCurrentContainer(record: DockerContainerTableRow) {
        return record.containers?.some(item => item.isCurrentContainer) ?? false
    }

    function getComposeContent(files: ComposeProjectFile[]) {
        if (files.length === 0) return ""

        return files
            .map(item => {
                const resolvedText = item.resolvedPath === item.sourcePath ? item.sourcePath : `${item.sourcePath}\n# 映射路径: ${item.resolvedPath}`
                return `# 文件: ${resolvedText}\n\n${item.content}`
            })
            .join("\n\n\n")
    }

    async function onReadComposeProject(record: DockerContainerTableRow) {
        if (!record.projectName) return
        if (!record.composeConfigFiles.length) return

        const result = await readComposeProject({
            composeFiles: record.composeConfigFiles,
        })

        setLogName(record.name)
        setLogContent(getComposeContent(result.files))
        setLogTitleSuffix("配置")
        setLogEmptyDescription("暂无配置")
        setLogOpen(true)
    }

    async function onProjectCommand(record: DockerContainerTableRow, command: ComposeProjectCommand) {
        if (!record.projectName) return
        if (!record.composeConfigFiles.length) return

        const result = await runComposeProject({ composeFiles: record.composeConfigFiles, command })

        if (command === ComposeProjectCommand.日志) {
            setLogName(record.name)
            setLogContent(result.output)
            setLogTitleSuffix("日志")
            setLogEmptyDescription("暂无日志")
            setLogOpen(true)
            return
        }

        await refetch()
    }

    function onReset() {
        form.resetFields()
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
        const items = getDockerContainerPortTags(value)

        if (items.length === 0) return "-"

        return items.map((item, index) => {
            const isAccessible = !!item.hostPort
            const hostPort = item.hostPort

            const tag = (
                <Tag color="green" variant={isAccessible ? TagVariant.实心 : TagVariant.描边}>
                    {item.label}
                </Tag>
            )

            if (!hostPort) {
                return (
                    <div key={`${item.label}-${index}`} className="mt-1 first:mt-0">
                        {tag}
                    </div>
                )
            }

            return (
                <div key={`${item.label}-${index}`} className="mt-1 first:mt-0">
                    <button
                        type="button"
                        className="cursor-pointer border-0 bg-transparent p-0 text-left transition-opacity hover:opacity-80"
                        title={`在新页面打开 ${hostPort} 端口`}
                        onClick={() => onOpenPort(hostPort)}
                    >
                        {tag}
                    </button>
                </div>
            )
        })
    }

    function onOpenPort(port: string) {
        const url = getDockerContainerPortUrl(port)

        if (!url) return

        window.open(url, "_blank", "noopener,noreferrer")
    }

    function getDockerContainerPortUrl(port: string) {
        if (typeof window === "undefined") return undefined

        const url = new URL(window.location.href)

        url.protocol = window.location.protocol === "https:" ? "https:" : "http:"
        url.hostname = window.location.hostname
        url.port = port
        url.pathname = "/"
        url.search = ""
        url.hash = ""

        return url.toString()
    }

    function renderContainerOperations(id: string, name: string, isCurrentContainer?: boolean) {
        const disabledTitle = isCurrentContainer ? "当前为管理系统运行容器，不可操作" : undefined

        return (
            <div className="inline-flex flex-wrap gap-1">
                <Button
                    size="small"
                    shape="circle"
                    color="orange"
                    variant="text"
                    title={disabledTitle ?? "停止"}
                    disabled={isRequesting || isCurrentContainer}
                    icon={<IconPlayerStop className="size-4" />}
                    onClick={() => onCommand(id, DockerContainerCommand.停止)}
                />
                <Button
                    size="small"
                    shape="circle"
                    color="yellow"
                    variant="text"
                    title={disabledTitle ?? "暂停"}
                    disabled={isRequesting || isCurrentContainer}
                    icon={<IconPlayerPause className="size-4" />}
                    onClick={() => onCommand(id, DockerContainerCommand.暂停)}
                />
                <Button
                    size="small"
                    shape="circle"
                    color="cyan"
                    variant="text"
                    title={disabledTitle ?? "重启"}
                    disabled={isRequesting || isCurrentContainer}
                    icon={<IconRefresh className="size-4" />}
                    onClick={() => onCommand(id, DockerContainerCommand.重启)}
                />
                <Popconfirm
                    title={`确认删除容器：${name}`}
                    description="删除后将无法恢复"
                    disabled={isRequesting || isCurrentContainer}
                    onConfirm={() => onCommand(id, DockerContainerCommand.删除)}
                >
                    <Button
                        size="small"
                        shape="circle"
                        color="danger"
                        variant="text"
                        title={disabledTitle ?? "删除"}
                        disabled={isRequesting || isCurrentContainer}
                        icon={<IconTrash className="size-4" />}
                    />
                </Popconfirm>
            </div>
        )
    }

    function renderProjectOperations(record: DockerContainerTableRow) {
        if (!record.projectName) return "-"
        const canRunProject = record.composeConfigFiles.length > 0
        const containsCurrentContainer = hasCurrentContainer(record)
        const isControlDisabled = isRequesting || !canRunProject || containsCurrentContainer
        const isViewDisabled = isRequesting || !canRunProject
        const disabledTitle = containsCurrentContainer ? "当前项目包含管理系统运行容器，不可直接操作" : undefined
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
                        title={disabledTitle ?? "停止"}
                        disabled={isControlDisabled}
                        icon={<IconPlayerStop className="size-4" />}
                        onClick={() => onProjectCommand(record, ComposeProjectCommand.停止)}
                    />
                ) : (
                    <Button
                        size="small"
                        shape="circle"
                        color="green"
                        variant="text"
                        title={disabledTitle ?? "启动"}
                        disabled={isControlDisabled}
                        icon={<IconPlayerPlay className="size-4" />}
                        onClick={() => onProjectCommand(record, ComposeProjectCommand.启动)}
                    />
                )}
                <Button
                    size="small"
                    shape="circle"
                    color="cyan"
                    variant="text"
                    title={disabledTitle ?? "重启"}
                    disabled={isControlDisabled}
                    icon={<IconRefresh className="size-4" />}
                    onClick={() => onProjectCommand(record, ComposeProjectCommand.重启)}
                />
                <Button
                    size="small"
                    shape="circle"
                    color="blue"
                    variant="text"
                    title={disabledTitle ?? "拉取"}
                    disabled={isControlDisabled}
                    icon={<IconDownload className="size-4" />}
                    onClick={() => onProjectCommand(record, ComposeProjectCommand.拉取)}
                />
                <Button
                    size="small"
                    shape="circle"
                    color="default"
                    variant="text"
                    title="查看配置"
                    disabled={isViewDisabled}
                    icon={<IconCode className="size-4" />}
                    onClick={() => onReadComposeProject(record)}
                />
                <Button
                    size="small"
                    shape="circle"
                    color="purple"
                    variant="text"
                    title="日志"
                    disabled={isViewDisabled}
                    icon={<IconFileText className="size-4" />}
                    onClick={() => onProjectCommand(record, ComposeProjectCommand.日志)}
                />
                <Popconfirm
                    title={`确认删除项目：${getProjectLabel(record)}`}
                    description="将执行 docker compose down"
                    disabled={isControlDisabled}
                    onConfirm={() => onProjectCommand(record, ComposeProjectCommand.删除)}
                >
                    <Button
                        size="small"
                        shape="circle"
                        color="danger"
                        variant="text"
                        title={disabledTitle ?? "删除"}
                        disabled={isControlDisabled}
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

        const projectLabelMap = new Map<string, string>()

        ;(data ?? []).forEach(item => {
            const name = item.projectName?.trim()
            if (!name) return
            projectLabelMap.set(name, item.projectDisplayName?.trim() || name)
        })

        return [
            ...managedProjects.map(item => ({ label: projectLabelMap.get(item) ?? item, value: item })),
            ...unmanagedProjects.map(item => ({ label: projectLabelMap.get(item) ?? item, value: item })),
            { label: "非平台项目", value: unmanagedProjectValue },
            { label: "未归属项目", value: noProjectValue },
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
            const groupName = item.projectDisplayName ?? item.projectName ?? noProjectGroupName
            const cached = projectMap.get(groupKey)

            if (cached) {
                cached.containers?.push(item)
                cached.composeConfigFiles = mergeComposeFiles(cached.composeConfigFiles, item.composeConfigFiles)
                if (!cached.projectId && item.projectId) cached.projectId = item.projectId
                if (!cached.projectDisplayName && item.projectDisplayName) cached.projectDisplayName = item.projectDisplayName
                return
            }

            const row: DockerContainerTableRow = {
                id: `project:${groupKey}`,
                rowType: DockerContainerRowType.项目,
                name: groupName,
                composeConfigFiles: normalizeComposeFiles(item.composeConfigFiles),
                projectId: item.projectId,
                projectName: item.projectName,
                projectDisplayName: item.projectDisplayName,
                isManagedProject: item.projectName ? item.isManagedProject : false,
                containers: [item],
            }

            projectMap.set(groupKey, row)
            rows.push(row)
        })

        const sortedRows = rows.map(row => ({
            ...row,
            containers:
                row.containers?.slice().sort((first, second) => getSortResult(compareContainerItem(first, second, query.childSortBy), query.childSortOrder)) ??
                row.containers,
        }))

        sortedRows.sort((first, second) => getSortResult(compareTableRow(first, second, query.sortBy), query.sortOrder))

        return sortedRows
    }, [filteredData, query.childSortBy, query.childSortOrder, query.sortBy, query.sortOrder])

    const pagedData = useMemo(() => {
        const start = (pageNum - 1) * pageSize
        const end = start + pageSize
        return tableRows.slice(start, end)
    }, [pageNum, pageSize, tableRows])

    const expandableRowKeys = useMemo(() => tableRows.filter(item => isProjectRow(item) && !!item.containers?.length).map(item => item.id), [tableRows])

    const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([])

    const hasExpandableRows = expandableRowKeys.length > 0
    const isAllExpanded = hasExpandableRows && expandableRowKeys.every(item => expandedRowKeys.includes(item))

    useEffect(() => {
        setExpandedRowKeys(prev => prev.filter(item => expandableRowKeys.includes(item)))
    }, [expandableRowKeys])

    function onToggleExpandAll() {
        setExpandedRowKeys(isAllExpanded ? [] : expandableRowKeys)
    }

    const onTableChange: TableProps<DockerContainerTableRow>["onChange"] = function onTableChange(pagination, filters, sorter) {
        if (Array.isArray(sorter)) return

        const sortBy = (typeof sorter.columnKey === "string" ? sorter.columnKey : typeof sorter.field === "string" ? sorter.field : undefined) ?? undefined

        setQuery(prev => ({
            ...prev,
            pageNum: pagination.current ?? prev.pageNum,
            pageSize: pagination.pageSize ?? prev.pageSize,
            sortBy: sortBy as DockerContainerSortByParams | undefined,
            sortOrder: getSorterOrder(sorter.order),
        }))
    }

    const onContainerTableChange: TableProps<DockerContainerItem>["onChange"] = function onContainerTableChange(pagination, filters, sorter) {
        if (Array.isArray(sorter)) return

        const childSortBy = (typeof sorter.columnKey === "string" ? sorter.columnKey : typeof sorter.field === "string" ? sorter.field : undefined) ?? undefined

        setQuery(prev => ({
            ...prev,
            childSortBy: childSortBy as DockerContainerChildSortByParams | undefined,
            childSortOrder: getSorterOrder(sorter.order),
        }))
    }

    const columns: Columns<DockerContainerTableRow> = [
        {
            title: "名称",
            dataIndex: "name",
            key: "name",
            align: "left",
            sorter: true,
            sortOrder: getSortOrder(query, "name"),
            render(value: string, record) {
                if (!isProjectRow(record)) return value
                return (
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{value}</span>
                        {hasCurrentContainer(record) ? <Tag color="green">当前运行环境</Tag> : null}
                    </div>
                )
            },
        },
        {
            title: "项目归属",
            dataIndex: "isManagedProject",
            key: "project",
            align: "center",
            sorter: true,
            sortOrder: getSortOrder(query, "project"),
            render(value: boolean | undefined, record) {
                if (isProjectRow(record) && !record.projectName) return <Tag>未归属项目</Tag>
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
                return renderContainerOperations(record.id, record.name)
            },
        },
    ]

    const containerColumns: Columns<DockerContainerItem> = [
        {
            title: "容器名称",
            dataIndex: "name",
            key: "name",
            align: "left",
            sorter: true,
            sortOrder: getSortOrder({ sortBy: query.childSortBy, sortOrder: query.childSortOrder }, "name"),
            render(value: string, record) {
                return (
                    <div className="flex flex-wrap items-center gap-2">
                        <span>{value}</span>
                        {record.isCurrentContainer ? <Tag color="green">当前容器</Tag> : null}
                    </div>
                )
            },
        },
        {
            title: "容器 ID",
            dataIndex: "id",
            key: "id",
            align: "center",
            sorter: true,
            sortOrder: getSortOrder({ sortBy: query.childSortBy, sortOrder: query.childSortOrder }, "id"),
        },
        {
            title: "镜像",
            dataIndex: "image",
            key: "image",
            align: "center",
            sorter: true,
            sortOrder: getSortOrder({ sortBy: query.childSortBy, sortOrder: query.childSortOrder }, "image"),
            render(value: string | undefined) {
                if (!value) return "-"

                return (
                    <Link className="text-sky-600 transition-colors hover:text-sky-500" href={getImageHref(value)}>
                        {value}
                    </Link>
                )
            },
        },
        {
            title: "状态",
            dataIndex: "status",
            key: "status",
            align: "center",
            sorter: true,
            sortOrder: getSortOrder({ sortBy: query.childSortBy, sortOrder: query.childSortOrder }, "status"),
            render(value: string | undefined) {
                return value || "-"
            },
        },
        {
            title: "创建时间",
            dataIndex: "createdAt",
            key: "createdAt",
            align: "center",
            sorter: true,
            sortOrder: getSortOrder({ sortBy: query.childSortBy, sortOrder: query.childSortOrder }, "createdAt"),
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
                return renderContainerOperations(record.id, record.name, record.isCurrentContainer)
            },
        },
    ]

    return (
        <div className="flex h-full flex-col gap-4 pt-4">
            <title>容器管理</title>
            <div className="flex-none px-4">
                <Form<FormParams> name="query-container-form" form={form} className="gap-y-4" layout="inline" onFinish={setQuery}>
                    <FormItem<FormParams> name="name" label="容器名称">
                        <Input />
                    </FormItem>
                    <FormItem<FormParams> name="image" label="镜像">
                        <Input />
                    </FormItem>
                    <FormItem<FormParams> name="status" label="状态">
                        <DockerContainerStatusSelect className="!w-44" allowClear placeholder="选择状态" />
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
                <ProjectLogDrawer
                    name={logName}
                    open={logOpen}
                    content={logContent}
                    titleSuffix={logTitleSuffix}
                    emptyDescription={logEmptyDescription}
                    onClose={onCloseLog}
                />
                <Table<DockerContainerTableRow>
                    rowKey="id"
                    scroll={{ y }}
                    columns={columns}
                    dataSource={pagedData}
                    loading={isLoading}
                    onChange={onTableChange}
                    pagination={{
                        current: pageNum,
                        pageSize,
                        showTotal,
                        total: tableRows.length,
                        showSizeChanger: true,
                    }}
                    expandable={{
                        expandedRowKeys,
                        columnTitle: (
                            <div className="flex items-center justify-center">
                                <Button
                                    size="small"
                                    shape="circle"
                                    type="text"
                                    disabled={!hasExpandableRows}
                                    title={isAllExpanded ? "全部收起" : "全部展开"}
                                    icon={isAllExpanded ? <IconMinus className="size-4" /> : <IconPlus className="size-4" />}
                                    onClick={onToggleExpandAll}
                                />
                            </div>
                        ),
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
                                        onChange={onContainerTableChange}
                                        pagination={false}
                                    />
                                </div>
                            )
                        },
                        rowExpandable(record) {
                            return isProjectRow(record) && !!record.containers?.length
                        },
                        onExpandedRowsChange(keys) {
                            setExpandedRowKeys(keys.map(item => String(item)))
                        },
                    }}
                />
            </div>
        </div>
    )
}

export default Page
