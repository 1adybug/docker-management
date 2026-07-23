"use client"

import { type FC, useEffect, useMemo, useState } from "react"

import { useForm } from "@tanstack/react-form"
import type { ColumnDef, SortingState, Updater } from "@tanstack/react-table"
import { formatTime } from "deepsea-tools"
import {
    ChevronDownIcon,
    ChevronRightIcon,
    CodeIcon,
    DownloadIcon,
    FileTextIcon,
    LoaderCircleIcon,
    PauseIcon,
    PlayIcon,
    RefreshCwIcon,
    SquareIcon,
    Trash2Icon,
} from "lucide-react"
import Link from "next/link"
import { useQueryState } from "soda-next"

import { ConfirmButton } from "@/components/ConfirmButton"
import { DataTable } from "@/components/DataTable"
import { DockerContainerStatusSelect } from "@/components/DockerContainerStatusSelect"
import { ProjectLogDrawer } from "@/components/ProjectLogDrawer"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import { type DockerContainerStatus, DockerContainerStatus as DockerContainerStatusValues } from "@/constants"

import { useQueryDockerContainer } from "@/hooks/useQueryDockerContainer"
import { useReadComposeProject } from "@/hooks/useReadComposeProject"
import { useRunComposeProject } from "@/hooks/useRunComposeProject"
import { useRunDockerContainer } from "@/hooks/useRunDockerContainer"

import { getParser } from "@/schemas"
import { ComposeProjectCommand } from "@/schemas/composeProjectCommand"
import { type DockerContainerChildSortByParams, dockerContainerChildSortBySchema } from "@/schemas/dockerContainerChildSortBy"
import { DockerContainerCommand } from "@/schemas/dockerContainerCommand"
import { type DockerContainerSortByParams, dockerContainerSortBySchema } from "@/schemas/dockerContainerSortBy"
import { pageNumParser } from "@/schemas/pageNum"
import { pageSizeParser } from "@/schemas/pageSize"
import { type SortOrderParams, sortOrderSchema } from "@/schemas/sortOrder"

import type { ComposeProjectFile } from "@/shared/readComposeProject"

export interface ContainerFilterParams {
    name?: string
    image?: string
    status?: DockerContainerStatus
    project?: string
}

export interface ContainerTableQuery extends ContainerFilterParams {
    pageNum?: number
    pageSize?: number
    sortBy?: DockerContainerSortByParams
    sortOrder?: SortOrderParams
    childSortBy?: DockerContainerChildSortByParams
    childSortOrder?: SortOrderParams
}

export const DockerContainerRowType = {
    项目: "project",
    容器: "container",
} as const

export type DockerContainerRowType = (typeof DockerContainerRowType)[keyof typeof DockerContainerRowType]

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
    isCurrentContainer?: boolean
    children?: DockerContainerTableRow[]
}

interface ContainerFilterValues {
    name: string
    image: string
    status?: DockerContainerStatus
    project?: string
}

interface ProjectOptionMetadata {
    managed: boolean
    label: string
}

const unmanagedProjectValue = "__unmanaged"
const noProjectValue = "__none"
const noProjectGroupKey = "__no_project_group__"
const noProjectGroupName = "未归属项目"

function getStatusValue(status?: string) {
    const value = status?.toLowerCase() ?? ""
    if (value.includes("up")) return DockerContainerStatusValues.运行中
    if (value.includes("exited")) return DockerContainerStatusValues.已退出
    if (value.includes("restarting")) return DockerContainerStatusValues.重启中
    if (value.includes("paused")) return DockerContainerStatusValues.已暂停
    if (value.includes("created")) return DockerContainerStatusValues.已创建
    if (value.includes("dead")) return DockerContainerStatusValues.已失效
    return DockerContainerStatusValues.其他
}

function normalizeComposeFiles(files: string[]) {
    return Array.from(new Set(files.map(item => item.trim()).filter(Boolean)))
}

function mergeComposeFiles(current: string[], next: string[]) {
    return normalizeComposeFiles([...current, ...next])
}

function normalizeName(value?: string) {
    return value?.trim() ?? ""
}

function compareName(first?: string, second?: string) {
    return normalizeName(first).localeCompare(normalizeName(second), "zh-CN", { numeric: true })
}

function getCreatedAtTimestamp(value?: string) {
    const timestamp = Date.parse(value ?? "")
    return Number.isNaN(timestamp) ? 0 : timestamp
}

function getSortResult(result: number, sortOrder?: SortOrderParams) {
    return sortOrder === "desc" ? result * -1 : result
}

function getProjectSortWeight(record: DockerContainerTableRow) {
    if (!record.projectName) return 2
    return record.isManagedProject ? 0 : 1
}

function getProjectLabel(record: DockerContainerTableRow) {
    return record.projectDisplayName ?? record.projectName ?? noProjectGroupName
}

function compareProject(first: DockerContainerTableRow, second: DockerContainerTableRow) {
    return getProjectSortWeight(first) - getProjectSortWeight(second) || compareName(getProjectLabel(first), getProjectLabel(second))
}

function compareProjectRows(first: DockerContainerTableRow, second: DockerContainerTableRow, sortBy?: DockerContainerSortByParams) {
    if (sortBy === "name") return compareName(first.name, second.name) || compareProject(first, second)
    if (sortBy === "project") return compareProject(first, second) || compareName(first.name, second.name)
    return compareProject(first, second) || compareName(first.name, second.name)
}

function compareContainerRows(first: DockerContainerTableRow, second: DockerContainerTableRow, sortBy?: DockerContainerChildSortByParams) {
    switch (sortBy) {
        case "id":
            return compareName(first.id, second.id) || compareName(first.name, second.name)
        case "image":
            return compareName(first.image, second.image) || compareName(first.name, second.name)
        case "status":
            return compareName(getStatusValue(first.status), getStatusValue(second.status)) || compareName(first.name, second.name)
        case "createdAt":
            return getCreatedAtTimestamp(first.createdAt) - getCreatedAtTimestamp(second.createdAt) || compareName(first.name, second.name)
        case "name":
        default:
            return compareName(first.name, second.name) || compareName(first.id, second.id)
    }
}

function getDockerContainerPortTags(value?: string) {
    if (!value) return []

    return value
        .split(",")
        .map(item => item.trim())
        .filter(Boolean)
        .map(item => ({ label: item, hostPort: getDockerContainerAccessiblePort(item) }))
}

function getDockerContainerAccessiblePort(value: string) {
    const matched = value.match(/^(.*):(\d+)\s*->\s*(\d+(?:-\d+)?)\/([a-z0-9]+)$/iu)
    if (!matched) return undefined

    const [, host, hostPort, , protocol] = matched
    if (protocol.toLowerCase() !== "tcp" || isDockerContainerLocalHostBinding(host)) return undefined
    return hostPort
}

function isDockerContainerLocalHostBinding(value: string) {
    const host = value.trim().toLowerCase()
    return host === "127.0.0.1" || host === "localhost" || host === "::1" || host === "[::1]"
}

function getImageHref(name?: string) {
    return name?.trim() ? `/image?name=${encodeURIComponent(name.trim())}` : "/image"
}

function getStatusBadgeVariant(status?: string) {
    const value = getStatusValue(status)
    if (value === DockerContainerStatusValues.运行中) return "default" as const
    if (value === DockerContainerStatusValues.已失效 || value === DockerContainerStatusValues.已退出) return "destructive" as const
    return "secondary" as const
}

const Page: FC = () => {
    const [logOpen, setLogOpen] = useState(false)
    const [logName, setLogName] = useState<string>()
    const [logContent, setLogContent] = useState<string>()
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

    const pageNum = query.pageNum ?? 1
    const pageSize = query.pageSize ?? 10

    const form = useForm({
        defaultValues: {
            name: query.name ?? "",
            image: query.image ?? "",
            status: query.status as DockerContainerStatus | undefined,
            project: query.project,
        } as ContainerFilterValues,
        onSubmit({ value }) {
            setQuery(previous => ({
                ...previous,
                name: value.name.trim() || undefined,
                image: value.image.trim() || undefined,
                status: value.status,
                project: value.project,
                pageNum: 1,
            }))
        },
    })

    useEffect(
        () =>
            void form.reset({
                name: query.name ?? "",
                image: query.image ?? "",
                status: query.status as DockerContainerStatus | undefined,
                project: query.project,
            }),
        [form, query.image, query.name, query.project, query.status],
    )

    function onCloseLog() {
        setLogOpen(false)
        setLogName(undefined)
        setLogContent(undefined)
        setLogTitleSuffix("日志")
        setLogEmptyDescription("暂无日志")
    }

    function getComposeContent(files: ComposeProjectFile[]) {
        return files
            .map(item => {
                const resolvedText = item.resolvedPath === item.sourcePath ? item.sourcePath : `${item.sourcePath}\n# 映射路径: ${item.resolvedPath}`
                return `# 文件: ${resolvedText}\n\n${item.content}`
            })
            .join("\n\n\n")
    }

    async function onReadComposeProject(record: DockerContainerTableRow) {
        if (!record.projectName || !record.composeConfigFiles.length) return
        const result = await readComposeProject({ composeFiles: record.composeConfigFiles })
        setLogName(record.name)
        setLogContent(getComposeContent(result.files))
        setLogTitleSuffix("配置")
        setLogEmptyDescription("暂无配置")
        setLogOpen(true)
    }

    async function onProjectCommand(record: DockerContainerTableRow, command: ComposeProjectCommand) {
        if (!record.projectName || !record.composeConfigFiles.length) return
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
        form.reset({ name: "", image: "", status: undefined, project: undefined })

        setQuery(previous => ({
            ...previous,
            name: undefined,
            image: undefined,
            status: undefined,
            project: undefined,
            pageNum: 1,
        }))
    }

    function getDockerContainerPortUrl(port: string) {
        const url = new URL(window.location.href)
        url.protocol = window.location.protocol === "https:" ? "https:" : "http:"
        url.hostname = window.location.hostname
        url.port = port
        url.pathname = "/"
        url.search = ""
        url.hash = ""
        return url.toString()
    }

    function renderPorts(value?: string) {
        const items = getDockerContainerPortTags(value)
        if (!items.length) return "-"

        return (
            <div className="flex flex-wrap justify-center gap-1">
                {items.map((item, index) =>
                    item.hostPort ? (
                        <button
                            key={`${item.label}-${index}`}
                            type="button"
                            title={`在新页面打开 ${item.hostPort} 端口`}
                            onClick={() => window.open(getDockerContainerPortUrl(item.hostPort!), "_blank", "noopener,noreferrer")}
                        >
                            <Badge>{item.label}</Badge>
                        </button>
                    ) : (
                        <Badge key={`${item.label}-${index}`} variant="outline">
                            {item.label}
                        </Badge>
                    ))}
            </div>
        )
    }

    function renderContainerOperations(record: DockerContainerTableRow) {
        const disabledTitle = record.isCurrentContainer ? "当前为管理系统运行容器，不可操作" : undefined
        const disabled = isRequesting || record.isCurrentContainer

        return (
            <div className="flex items-center justify-center gap-1">
                <Button
                    size="icon-xs"
                    variant="ghost"
                    title={disabledTitle ?? "停止"}
                    disabled={disabled}
                    onClick={() => runDockerContainer({ id: record.id, command: DockerContainerCommand.停止 })}
                >
                    <SquareIcon />
                </Button>
                <Button
                    size="icon-xs"
                    variant="ghost"
                    title={disabledTitle ?? "暂停"}
                    disabled={disabled}
                    onClick={() => runDockerContainer({ id: record.id, command: DockerContainerCommand.暂停 })}
                >
                    <PauseIcon />
                </Button>
                <Button
                    size="icon-xs"
                    variant="ghost"
                    title={disabledTitle ?? "重启"}
                    disabled={disabled}
                    onClick={() => runDockerContainer({ id: record.id, command: DockerContainerCommand.重启 })}
                >
                    <RefreshCwIcon />
                </Button>
                <ConfirmButton
                    title={`确认删除容器：${record.name}`}
                    description="删除后将无法恢复。"
                    size="icon-xs"
                    variant="destructive"
                    pending={isRunPending}
                    disabled={disabled}
                    onConfirm={() => runDockerContainer({ id: record.id, command: DockerContainerCommand.删除 })}
                >
                    <Trash2Icon />
                </ConfirmButton>
            </div>
        )
    }

    function getProjectRunningCount(children?: DockerContainerTableRow[]) {
        return (children ?? []).filter(item => getStatusValue(item.status) === DockerContainerStatusValues.运行中).length
    }

    function renderProjectOperations(record: DockerContainerTableRow) {
        if (!record.projectName) return "-"
        const canRunProject = record.composeConfigFiles.length > 0
        const containsCurrentContainer = record.children?.some(item => item.isCurrentContainer) ?? false
        const isControlDisabled = isRequesting || !canRunProject || containsCurrentContainer
        const isViewDisabled = isRequesting || !canRunProject
        const disabledTitle = containsCurrentContainer ? "当前项目包含管理系统运行容器，不可直接操作" : undefined
        const isRunning = getProjectRunningCount(record.children) > 0

        return (
            <div className="flex items-center justify-center gap-1">
                <Button
                    size="icon-xs"
                    variant="ghost"
                    title={disabledTitle ?? (isRunning ? "停止" : "启动")}
                    disabled={isControlDisabled}
                    onClick={() => onProjectCommand(record, isRunning ? ComposeProjectCommand.停止 : ComposeProjectCommand.启动)}
                >
                    {isRunning ? <SquareIcon /> : <PlayIcon />}
                </Button>
                <Button
                    size="icon-xs"
                    variant="ghost"
                    title={disabledTitle ?? "重启"}
                    disabled={isControlDisabled}
                    onClick={() => onProjectCommand(record, ComposeProjectCommand.重启)}
                >
                    <RefreshCwIcon />
                </Button>
                <Button
                    size="icon-xs"
                    variant="ghost"
                    title={disabledTitle ?? "拉取"}
                    disabled={isControlDisabled}
                    onClick={() => onProjectCommand(record, ComposeProjectCommand.拉取)}
                >
                    <DownloadIcon />
                </Button>
                <Button size="icon-xs" variant="ghost" title="查看配置" disabled={isViewDisabled} onClick={() => onReadComposeProject(record)}>
                    <CodeIcon />
                </Button>
                <Button
                    size="icon-xs"
                    variant="ghost"
                    title="日志"
                    disabled={isViewDisabled}
                    onClick={() => onProjectCommand(record, ComposeProjectCommand.日志)}
                >
                    <FileTextIcon />
                </Button>
                <ConfirmButton
                    title={`确认删除项目：${getProjectLabel(record)}`}
                    description="将执行 docker compose down。"
                    size="icon-xs"
                    variant="destructive"
                    pending={isRunComposeProjectPending}
                    disabled={isControlDisabled}
                    onConfirm={() => onProjectCommand(record, ComposeProjectCommand.删除)}
                >
                    <Trash2Icon />
                </ConfirmButton>
            </div>
        )
    }

    const projectOptions = useMemo(() => {
        const projectMap = new Map<string, ProjectOptionMetadata>()

        ;(data ?? []).forEach(item => {
            const name = item.projectName?.trim()
            if (!name) return
            const cached = projectMap.get(name)

            projectMap.set(name, {
                managed: cached?.managed || item.isManagedProject === true,
                label: item.projectDisplayName?.trim() || cached?.label || name,
            })
        })

        return [
            ...Array.from(projectMap.entries())
                .sort(([, first], [, second]) => Number(second.managed) - Number(first.managed) || compareName(first.label, second.label))
                .map(([value, item]) => ({ value, label: item.label })),
            { label: "非平台项目", value: unmanagedProjectValue },
            { label: "未归属项目", value: noProjectValue },
        ]
    }, [data])

    const filteredData = useMemo(() => {
        const name = query.name?.trim()
        const image = query.image?.trim()
        const status = query.status?.trim()

        return (data ?? []).filter(item => {
            const projectMatches =
                query.project === unmanagedProjectValue
                    ? !item.isManagedProject
                    : query.project === noProjectValue
                      ? !item.projectName
                      : query.project
                        ? item.projectName === query.project
                        : true

            return (
                (!name || item.name.includes(name)) &&
                (!image || item.image.includes(image)) &&
                (!status || getStatusValue(item.status) === status) &&
                projectMatches
            )
        })
    }, [data, query.image, query.name, query.project, query.status])

    const tableRows = useMemo(() => {
        const projectMap = new Map<string, DockerContainerTableRow>()

        filteredData.forEach(item => {
            const groupKey = item.projectName ?? noProjectGroupKey
            const cached = projectMap.get(groupKey)

            const child: DockerContainerTableRow = {
                id: item.id,
                rowType: DockerContainerRowType.容器,
                name: item.name,
                image: item.image,
                status: item.status,
                createdAt: item.createdAt,
                ports: item.ports,
                composeConfigFiles: item.composeConfigFiles,
                projectId: item.projectId,
                projectName: item.projectName,
                projectDisplayName: item.projectDisplayName,
                isManagedProject: item.isManagedProject,
                isCurrentContainer: item.isCurrentContainer,
            }

            if (cached) {
                cached.children?.push(child)
                cached.composeConfigFiles = mergeComposeFiles(cached.composeConfigFiles, item.composeConfigFiles)
                cached.projectId ??= item.projectId
                cached.projectDisplayName ??= item.projectDisplayName
                return
            }

            projectMap.set(groupKey, {
                id: `project:${groupKey}`,
                rowType: DockerContainerRowType.项目,
                name: item.projectDisplayName ?? item.projectName ?? noProjectGroupName,
                composeConfigFiles: normalizeComposeFiles(item.composeConfigFiles),
                projectId: item.projectId,
                projectName: item.projectName,
                projectDisplayName: item.projectDisplayName,
                isManagedProject: item.projectName ? item.isManagedProject : false,
                children: [child],
            })
        })

        return Array.from(projectMap.values())
            .map(row => ({
                ...row,
                children: row.children?.sort((first, second) => getSortResult(compareContainerRows(first, second, query.childSortBy), query.childSortOrder)),
            }))
            .sort((first, second) => getSortResult(compareProjectRows(first, second, query.sortBy), query.sortOrder))
    }, [filteredData, query.childSortBy, query.childSortOrder, query.sortBy, query.sortOrder])

    const pagedData = useMemo(() => tableRows.slice((pageNum - 1) * pageSize, pageNum * pageSize), [pageNum, pageSize, tableRows])
    const sorting: SortingState = query.childSortBy
        ? [{ id: query.childSortBy, desc: query.childSortOrder === "desc" }]
        : query.sortBy
          ? [{ id: query.sortBy, desc: query.sortOrder === "desc" }]
          : []

    const columns: ColumnDef<DockerContainerTableRow>[] = [
        {
            id: "expand",
            header: "",
            size: 48,
            cell: ({ row }) =>
                row.getCanExpand() ? (
                    <Button size="icon-xs" variant="ghost" title={row.getIsExpanded() ? "收起" : "展开"} onClick={row.getToggleExpandedHandler()}>
                        {row.getIsExpanded() ? <ChevronDownIcon /> : <ChevronRightIcon />}
                    </Button>
                ) : null,
        },
        {
            accessorKey: "name",
            header: "名称",
            enableSorting: true,
            size: 220,
            cell: ({ row }) => (
                <div className={row.original.rowType === DockerContainerRowType.容器 ? "pl-4" : "font-medium"}>
                    {row.original.name}
                    {row.original.isCurrentContainer && <Badge className="ml-2">当前容器</Badge>}
                </div>
            ),
        },
        {
            id: "project",
            header: "项目归属",
            enableSorting: true,
            size: 140,
            cell: ({ row }) => {
                const record = row.original
                if (!record.projectName) return record.rowType === DockerContainerRowType.项目 ? <Badge variant="outline">未归属项目</Badge> : "-"
                const badge = <Badge variant={record.isManagedProject ? "default" : "secondary"}>{record.isManagedProject ? "平台项目" : "非平台项目"}</Badge>
                return record.isManagedProject && record.projectId ? <Link href={`/project?id=${record.projectId}`}>{badge}</Link> : badge
            },
        },
        {
            accessorKey: "id",
            header: "容器 ID",
            enableSorting: true,
            size: 160,
            cell: ({ row }) => (row.original.rowType === DockerContainerRowType.容器 ? row.original.id : "-"),
        },
        {
            accessorKey: "image",
            header: "镜像",
            enableSorting: true,
            size: 220,
            cell: ({ row }) =>
                row.original.image ? (
                    <Link className="text-primary hover:underline" href={getImageHref(row.original.image)}>
                        {row.original.image}
                    </Link>
                ) : (
                    "-"
                ),
        },
        {
            accessorKey: "status",
            header: "状态",
            enableSorting: true,
            size: 130,
            cell: ({ row }) =>
                row.original.rowType === DockerContainerRowType.项目 ? (
                    row.original.children?.length ? (
                        `运行中 ${getProjectRunningCount(row.original.children)} / ${row.original.children.length}`
                    ) : (
                        "-"
                    )
                ) : (
                    <Badge variant={getStatusBadgeVariant(row.original.status)}>{row.original.status || "未知"}</Badge>
                ),
        },
        {
            accessorKey: "createdAt",
            header: "创建时间",
            enableSorting: true,
            size: 180,
            cell: ({ row }) => (row.original.createdAt ? formatTime(row.original.createdAt) : "-"),
        },
        {
            accessorKey: "ports",
            header: "端口",
            size: 220,
            cell: ({ row }) => renderPorts(row.original.ports),
        },
        {
            id: "actions",
            header: "操作",
            size: 220,
            cell: ({ row }) =>
                row.original.rowType === DockerContainerRowType.项目 ? renderProjectOperations(row.original) : renderContainerOperations(row.original),
        },
    ]

    function onSortingChange(updater: Updater<SortingState>) {
        const next = (typeof updater === "function" ? updater(sorting) : updater)[0]
        const order = next ? (next.desc ? "desc" : "asc") : undefined

        if (next?.id === "project") {
            setQuery(previous => ({ ...previous, sortBy: "project", sortOrder: order, pageNum: 1 }))
            return
        }

        if (next?.id === "name") {
            setQuery(previous => ({ ...previous, sortBy: "name", sortOrder: order, childSortBy: "name", childSortOrder: order, pageNum: 1 }))
            return
        }

        const childSortBy = next?.id as DockerContainerChildSortByParams | undefined
        setQuery(previous => ({ ...previous, childSortBy, childSortOrder: order, pageNum: 1 }))
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">容器管理</h1>
                    <p className="mt-1 text-sm text-muted-foreground">查看容器与 Compose 项目状态，并执行运行维护操作。</p>
                </div>
                <Button variant="outline" disabled={isRequesting} onClick={() => void refetch()}>
                    {isLoading ? <LoaderCircleIcon className="animate-spin" /> : <RefreshCwIcon />}
                    刷新
                </Button>
            </div>
            <Card>
                <CardContent className="pt-6">
                    <form
                        className="flex flex-wrap items-end gap-3"
                        onSubmit={event => {
                            event.preventDefault()
                            event.stopPropagation()
                            void form.handleSubmit()
                        }}
                    >
                        <form.Field name="name">
                            {field => (
                                <Field className="w-full sm:w-44">
                                    <FieldLabel htmlFor="container-name">容器名称</FieldLabel>
                                    <Input id="container-name" value={field.state.value} onChange={event => field.handleChange(event.target.value)} />
                                </Field>
                            )}
                        </form.Field>
                        <form.Field name="image">
                            {field => (
                                <Field className="w-full sm:w-52">
                                    <FieldLabel htmlFor="container-image">镜像</FieldLabel>
                                    <Input id="container-image" value={field.state.value} onChange={event => field.handleChange(event.target.value)} />
                                </Field>
                            )}
                        </form.Field>
                        <form.Field name="status">
                            {field => (
                                <Field className="w-full sm:w-44">
                                    <FieldLabel>状态</FieldLabel>
                                    <DockerContainerStatusSelect value={field.state.value} onValueChange={field.handleChange} />
                                </Field>
                            )}
                        </form.Field>
                        <form.Field name="project">
                            {field => (
                                <Field className="w-full sm:w-52">
                                    <FieldLabel>项目</FieldLabel>
                                    <Select value={field.state.value} onValueChange={field.handleChange}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="选择项目" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {projectOptions.map(option => (
                                                <SelectItem key={option.value} value={option.value}>
                                                    {option.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </Field>
                            )}
                        </form.Field>
                        <Button type="submit" disabled={isRequesting}>
                            查询
                        </Button>
                        <Button type="button" variant="ghost" disabled={isRequesting} onClick={onReset}>
                            重置
                        </Button>
                    </form>
                </CardContent>
            </Card>
            <DataTable
                columns={columns}
                columnPinning={{ left: ["expand", "name"], right: ["actions"] }}
                columnSizingKey="docker-container"
                data={pagedData}
                loading={isLoading}
                pageNum={pageNum}
                pageSize={pageSize}
                sorting={sorting}
                total={tableRows.length}
                getRowId={row => row.id}
                getRowCanExpand={row => row.rowType === DockerContainerRowType.项目 && !!row.children?.length}
                getSubRows={row => row.children}
                onPageChange={(pageNum, pageSize) => setQuery(previous => ({ ...previous, pageNum, pageSize }))}
                onSortingChange={onSortingChange}
            />
            <ProjectLogDrawer
                name={logName}
                open={logOpen}
                content={logContent}
                titleSuffix={logTitleSuffix}
                emptyDescription={logEmptyDescription}
                onClose={onCloseLog}
            />
        </div>
    )
}

export default Page
