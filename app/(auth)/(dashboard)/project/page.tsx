"use client"

import { type FC, useEffect, useMemo, useRef, useState } from "react"

import { useForm } from "@tanstack/react-form"
import type { ColumnDef, SortingState, Updater } from "@tanstack/react-table"
import { clsx, formatTime } from "deepsea-tools"
import { CopyIcon, DownloadIcon, FileTextIcon, LoaderCircleIcon, PencilIcon, PlayIcon, PlusIcon, RefreshCwIcon, SquareIcon, Trash2Icon } from "lucide-react"
import { useRouter } from "next/navigation"
import type { StateToQueryFnMap } from "soda-hooks"
import { useQueryState } from "soda-next"

import { DataTable } from "@/components/DataTable"
import { DatePicker } from "@/components/DatePicker"
import { ProjectLogDrawer } from "@/components/ProjectLogDrawer"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"

import { DockerContainerStatus } from "@/constants"

import { useCheckProjectStart } from "@/hooks/useCheckProjectStart"
import { useDeleteProject } from "@/hooks/useDeleteProject"
import { useQueryDockerContainer } from "@/hooks/useQueryDockerContainer"
import { useQueryProject } from "@/hooks/useQueryProject"
import { useRunProject } from "@/hooks/useRunProject"

import { getParser } from "@/schemas"
import { type CheckProjectStartResult, type ProjectStartMountItem, ProjectStartMountStatus } from "@/schemas/checkProjectStart"
import { pageNumParser } from "@/schemas/pageNum"
import { pageSizeParser } from "@/schemas/pageSize"
import { ProjectCommand } from "@/schemas/projectCommand"
import { type ProjectSortByParams, projectSortBySchema } from "@/schemas/projectSortBy"
import type { ProjectStartMountOption } from "@/schemas/projectStartMountOption"
import { ProjectStartMountPathKind } from "@/schemas/projectStartMountPathKind"
import { sortOrderSchema } from "@/schemas/sortOrder"

import type { DockerContainerItem } from "@/shared/queryDockerContainer"
import type { ProjectSummary } from "@/shared/queryProject"

import { parseQueryDate, stringifyQueryEndDate, stringifyQueryStartDate } from "@/utils/queryDate"
import { toast } from "@/utils/toast"

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
    mountPathOptions: ProjectStartMountOption[]
}

/** 项目删除目标 */
export interface ProjectDeleteTarget {
    name: string
    displayName?: string
}

export interface RequestStartCheckParams {
    name: string
    mountPathOptions: ProjectStartMountOption[]
}

export interface UpdateStartCheckMountPathOptionParams {
    mountPathOptions: ProjectStartMountOption[]
    key: string
    pathKind: ProjectStartMountPathKind
    createDirectory?: boolean
}

export interface StartCheckMountPathKindChangeParams {
    item: ProjectStartMountItem
    pathKind: ProjectStartMountPathKind
}

export interface StartCheckMountPathCreateDirectoryChangeParams {
    item: ProjectStartMountItem
    createDirectory: boolean
}

export interface ProjectStartMountItemCardProps {
    item: ProjectStartMountItem
    disabled: boolean
    onPathKindChange: (params: StartCheckMountPathKindChangeParams) => void | Promise<void>
    onCreateDirectoryChange: (params: StartCheckMountPathCreateDirectoryChangeParams) => void | Promise<void>
}

interface ProjectFilterFormValues {
    name: string
    xName: string
    contentKeyword: string
    createdAfter?: Date
    createdBefore?: Date
    updatedAfter?: Date
    updatedBefore?: Date
}

const defaultProjectStartCheckState: ProjectStartCheckState = {
    mountPathOptions: [],
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
    if (status === ProjectStartMountStatus.将创建) return "将创建"
    return "不可创建"
}

function getStartCheckStatusClassName(status: ProjectStartMountStatus) {
    if (status === ProjectStartMountStatus.已存在)
        return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
    if (status === ProjectStartMountStatus.将创建) return "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-300"
    return "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
}

function getProjectStartMountPathKindText(pathKind: ProjectStartMountPathKind) {
    return pathKind === ProjectStartMountPathKind.文件 ? "文件" : "文件夹"
}

function getNextMountPathOptions({ mountPathOptions, key, pathKind, createDirectory }: UpdateStartCheckMountPathOptionParams) {
    const nextOption = {
        key,
        pathKind,
        createDirectory: pathKind === ProjectStartMountPathKind.文件夹 ? (createDirectory ?? true) : undefined,
    } as ProjectStartMountOption

    const nextMountPathOptions = [...mountPathOptions]

    const targetIndex = nextMountPathOptions.findIndex(item => item.key === key)

    if (targetIndex >= 0) nextMountPathOptions[targetIndex] = nextOption
    else nextMountPathOptions.push(nextOption)

    return nextMountPathOptions
}

function getProjectDeleteTitle(target?: ProjectDeleteTarget) {
    if (!target) return "删除项目"
    const name = target.name.trim()
    const displayName = target.displayName?.trim()
    if (displayName && displayName !== name) return `删除项目：${displayName}（${name}）`
    return `删除项目：${displayName || name}`
}

const ProjectStartMountItemCard: FC<ProjectStartMountItemCardProps> = ({ item, disabled, onPathKindChange, onCreateDirectoryChange }) => {
    const isSamePath = item.sourcePath === item.resolvedPath

    return (
        <div className="rounded-2xl border bg-card p-3">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{item.sourcePath}</div>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <div>服务：{item.serviceName}</div>
                        <div>容器路径：{item.targetPath}</div>
                        <div>类型：{getProjectStartMountPathKindText(item.pathKind)}</div>
                    </div>
                    {!isSamePath && <div className="mt-1 break-all text-xs text-muted-foreground">实际路径：{item.resolvedPath}</div>}
                    <div className="mt-1 text-xs text-muted-foreground">{item.message || "-"}</div>
                    {item.canConfigure && !item.exists && (
                        <div className="mt-3 rounded-2xl border bg-muted/40 p-3">
                            <div className="flex flex-wrap items-center gap-4">
                                <Field className="w-32">
                                    <FieldLabel>路径类型</FieldLabel>
                                    <Select
                                        value={item.pathKind}
                                        disabled={disabled}
                                        onValueChange={value => void onPathKindChange({ item, pathKind: value as ProjectStartMountPathKind })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Object.entries(ProjectStartMountPathKind).map(([label, value]) => (
                                                <SelectItem key={value} value={value}>
                                                    {label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </Field>
                                {item.pathKind === ProjectStartMountPathKind.文件夹 && (
                                    <Field className="w-auto" orientation="horizontal">
                                        <Switch
                                            checked={item.createDirectory !== false}
                                            disabled={disabled}
                                            onCheckedChange={createDirectory => void onCreateDirectoryChange({ item, createDirectory })}
                                        />
                                        <FieldLabel>启动时自动创建文件夹</FieldLabel>
                                    </Field>
                                )}
                            </div>
                        </div>
                    )}
                </div>
                <Badge className={clsx("flex-none", getStartCheckStatusClassName(item.status))} variant="outline">
                    {getStartCheckStatusText(item.status)}
                </Badge>
            </div>
        </div>
    )
}

const queryParsers = {
    createdBefore: parseQueryDate,
    createdAfter: parseQueryDate,
    updatedBefore: parseQueryDate,
    updatedAfter: parseQueryDate,
    pageNum: pageNumParser,
    pageSize: pageSizeParser,
    sortBy: getParser(projectSortBySchema.optional().catch(undefined)),
    sortOrder: getParser(sortOrderSchema.optional().catch(undefined)),
}

const queryStringifiers: StateToQueryFnMap<typeof queryParsers> = {
    createdBefore: stringifyQueryEndDate,
    createdAfter: stringifyQueryStartDate,
    updatedBefore: stringifyQueryEndDate,
    updatedAfter: stringifyQueryStartDate,
}

const Page: FC = () => {
    const [logOpen, setLogOpen] = useState(false)
    const [logName, setLogName] = useState<string>()
    const [logContent, setLogContent] = useState<string>()
    const [deleteOpen, setDeleteOpen] = useState(false)
    const [deleteTarget, setDeleteTarget] = useState<ProjectDeleteTarget>()
    const [deleteMode, setDeleteMode] = useState<ProjectDeleteMode>(ProjectDeleteMode.仅删除项目)
    const [startCheckOpen, setStartCheckOpen] = useState(false)
    const [startCheck, setStartCheck] = useState<ProjectStartCheckState>(defaultProjectStartCheckState)

    const router = useRouter()
    const startCheckRequestId = useRef(0)

    const [query, setQuery] = useQueryState({
        keys: ["id", "name", "xName", "contentKeyword"],
        parse: queryParsers,
        stringify: queryStringifiers,
    })

    const pageNum = query.pageNum ?? 1
    const pageSize = query.pageSize ?? 10

    const form = useForm({
        defaultValues: {
            name: query.name ?? "",
            xName: query.xName ?? "",
            contentKeyword: query.contentKeyword ?? "",
            createdAfter: query.createdAfter,
            createdBefore: query.createdBefore,
            updatedAfter: query.updatedAfter,
            updatedBefore: query.updatedBefore,
        } as ProjectFilterFormValues,
        onSubmit({ value }) {
            setQuery(previous => ({
                ...previous,
                id: undefined,
                name: value.name.trim() || undefined,
                xName: value.xName.trim() || undefined,
                contentKeyword: value.contentKeyword.trim() || undefined,
                createdAfter: value.createdAfter,
                createdBefore: value.createdBefore,
                updatedAfter: value.updatedAfter,
                updatedBefore: value.updatedBefore,
                pageNum: 1,
            }))
        },
    })

    const { data, isLoading } = useQueryProject({
        id: query.id,
        createdAfter: query.createdAfter,
        createdBefore: query.createdBefore,
        updatedAfter: query.updatedAfter,
        updatedBefore: query.updatedBefore,
        pageNum,
        pageSize,
        name: query.name,
        xName: query.xName,
        contentKeyword: query.contentKeyword,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
    })

    const { data: containerData } = useQueryDockerContainer()
    const { mutateAsync: checkProjectStart, isPending: isCheckProjectStartPending } = useCheckProjectStart()
    const { mutateAsync: deleteProject, isPending: isDeletePending } = useDeleteProject()
    const { mutateAsync: runProject, isPending: isRunPending } = useRunProject()
    const isRequesting = isLoading || isCheckProjectStartPending || isDeletePending || isRunPending

    useEffect(
        () =>
            void form.reset({
                name: query.name ?? "",
                xName: query.xName ?? "",
                contentKeyword: query.contentKeyword ?? "",
                createdAfter: query.createdAfter,
                createdBefore: query.createdBefore,
                updatedAfter: query.updatedAfter,
                updatedBefore: query.updatedBefore,
            }),
        [form, query.contentKeyword, query.createdAfter, query.createdBefore, query.name, query.updatedAfter, query.updatedBefore, query.xName],
    )

    function onReset() {
        form.reset({ name: "", xName: "", contentKeyword: "" })
        setQuery({})
    }

    function onCloseLog() {
        setLogOpen(false)
        setLogName(undefined)
        setLogContent(undefined)
    }

    function onOpenDelete(project: ProjectDeleteTarget) {
        setDeleteTarget(project)
        setDeleteMode(ProjectDeleteMode.仅删除项目)
        setDeleteOpen(true)
    }

    function onCloseDelete() {
        if (isDeletePending) return
        setDeleteOpen(false)
        setDeleteTarget(undefined)
    }

    function onCloseStartCheck() {
        if (isRunPending || isCheckProjectStartPending) return
        startCheckRequestId.current += 1
        setStartCheckOpen(false)
        setStartCheck(defaultProjectStartCheckState)
    }

    async function requestStartCheck({ name, mountPathOptions }: RequestStartCheckParams) {
        const requestId = startCheckRequestId.current + 1
        startCheckRequestId.current = requestId
        const data = await checkProjectStart({ name, mountPathOptions: mountPathOptions.length > 0 ? mountPathOptions : undefined })
        if (startCheckRequestId.current !== requestId) return
        setStartCheck(previous => (previous.name === name ? { name, data, mountPathOptions } : previous))
    }

    async function onDeleteConfirm() {
        if (!deleteTarget?.name) return
        await deleteProject({ name: deleteTarget.name, cleanup: deleteMode === ProjectDeleteMode.删除并清理容器 })
        setDeleteOpen(false)
        setDeleteTarget(undefined)
    }

    async function onCommand(name: string, command: ProjectCommand) {
        if (command === ProjectCommand.启动) {
            const mountPathOptions: ProjectStartMountOption[] = []

            setStartCheckOpen(true)
            setStartCheck({ name, mountPathOptions })

            try {
                await requestStartCheck({ name, mountPathOptions })
            } catch (error) {
                startCheckRequestId.current += 1
                setStartCheckOpen(false)
                setStartCheck(defaultProjectStartCheckState)
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
            mountPathOptions: startCheck.mountPathOptions.length > 0 ? startCheck.mountPathOptions : undefined,
        })
        setStartCheckOpen(false)
        setStartCheck(defaultProjectStartCheckState)
    }

    async function onStartCheckMountPathKindChange({ item, pathKind }: StartCheckMountPathKindChangeParams) {
        const name = startCheck.name?.trim()
        if (!name || item.exists || !item.canConfigure) return

        const mountPathOptions = getNextMountPathOptions({
            mountPathOptions: startCheck.mountPathOptions,
            key: item.key,
            pathKind,
            createDirectory: pathKind === ProjectStartMountPathKind.文件夹 ? (item.createDirectory ?? true) : undefined,
        })

        setStartCheck(previous => ({ ...previous, mountPathOptions }))

        try {
            await requestStartCheck({ name, mountPathOptions })
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "挂载路径预检查失败")
        }
    }

    async function onStartCheckMountPathCreateDirectoryChange({ item, createDirectory }: StartCheckMountPathCreateDirectoryChangeParams) {
        const name = startCheck.name?.trim()
        if (!name || item.exists || !item.canConfigure || item.pathKind !== ProjectStartMountPathKind.文件夹) return

        const mountPathOptions = getNextMountPathOptions({
            mountPathOptions: startCheck.mountPathOptions,
            key: item.key,
            pathKind: item.pathKind,
            createDirectory,
        })

        setStartCheck(previous => ({ ...previous, mountPathOptions }))

        try {
            await requestStartCheck({ name, mountPathOptions })
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "挂载路径预检查失败")
        }
    }

    const projectStatusMap = useMemo(() => getProjectContainerStatusMap(containerData ?? []), [containerData])
    const sorting: SortingState = query.sortBy ? [{ id: query.sortBy, desc: query.sortOrder === "desc" }] : []

    const columns: ColumnDef<ProjectSummary>[] = [
        {
            accessorKey: "displayName",
            id: "xName",
            header: "项目名称",
            enableSorting: true,
            size: 180,
            cell: ({ row }) => row.original.displayName || row.original.name,
        },
        { accessorKey: "name", header: "英文名称", enableSorting: true, size: 220 },
        { accessorKey: "description", header: "项目描述", size: 280, cell: ({ row }) => row.original.description || "-" },
        { accessorKey: "createdUser", header: "创建用户", size: 130, cell: ({ row }) => row.original.createdUser || "-" },
        { accessorKey: "createdAt", header: "创建时间", enableSorting: true, size: 180, cell: ({ row }) => formatTime(row.original.createdAt) },
        { accessorKey: "updatedUser", header: "更新用户", size: 130, cell: ({ row }) => row.original.updatedUser || "-" },
        { accessorKey: "updatedAt", header: "更新时间", enableSorting: true, size: 180, cell: ({ row }) => formatTime(row.original.updatedAt) },
        {
            id: "actions",
            header: "操作",
            size: 260,
            cell: ({ row }) => {
                const record = row.original
                const isRunning = (projectStatusMap[record.name]?.runningCount ?? 0) > 0
                return (
                    <div className="flex items-center justify-center gap-1">
                        <Button
                            size="icon-xs"
                            variant="ghost"
                            title="编辑"
                            disabled={isRequesting}
                            onClick={() => router.push(`/project/editor?name=${encodeURIComponent(record.name)}`)}
                        >
                            <PencilIcon />
                        </Button>
                        <Button
                            size="icon-xs"
                            variant="ghost"
                            title="复制"
                            disabled={isRequesting}
                            onClick={() => router.push(`/project/editor?copyFrom=${encodeURIComponent(record.name)}`)}
                        >
                            <CopyIcon />
                        </Button>
                        <Button
                            size="icon-xs"
                            variant="ghost"
                            title={isRunning ? "停止" : "启动"}
                            disabled={isRequesting}
                            onClick={() => void onCommand(record.name, isRunning ? ProjectCommand.停止 : ProjectCommand.启动)}
                        >
                            {isRunning ? <SquareIcon /> : <PlayIcon />}
                        </Button>
                        <Button
                            size="icon-xs"
                            variant="ghost"
                            title="重启"
                            disabled={isRequesting}
                            onClick={() => void onCommand(record.name, ProjectCommand.重启)}
                        >
                            <RefreshCwIcon />
                        </Button>
                        <Button
                            size="icon-xs"
                            variant="ghost"
                            title="拉取"
                            disabled={isRequesting}
                            onClick={() => void onCommand(record.name, ProjectCommand.拉取)}
                        >
                            <DownloadIcon />
                        </Button>
                        <Button
                            size="icon-xs"
                            variant="ghost"
                            title="日志"
                            disabled={isRequesting}
                            onClick={() => void onCommand(record.name, ProjectCommand.日志)}
                        >
                            <FileTextIcon />
                        </Button>
                        <Button
                            size="icon-xs"
                            variant="destructive"
                            title="删除"
                            disabled={isRequesting}
                            onClick={() => onOpenDelete({ name: record.name, displayName: record.displayName })}
                        >
                            <Trash2Icon />
                        </Button>
                    </div>
                )
            },
        },
    ]

    function onSortingChange(updater: Updater<SortingState>) {
        const next = (typeof updater === "function" ? updater(sorting) : updater)[0]

        setQuery(previous => ({
            ...previous,
            sortBy: next?.id as ProjectSortByParams | undefined,
            sortOrder: next ? (next.desc ? "desc" : "asc") : undefined,
            pageNum: 1,
        }))
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">项目管理</h1>
                    <p className="mt-1 text-sm text-muted-foreground">管理 Compose 项目配置、挂载预检查和运行状态。</p>
                </div>
                <Button disabled={isRequesting} onClick={() => router.push("/project/editor")}>
                    <PlusIcon />
                    新增项目
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
                        {(
                            [
                                ["name", "英文名称"],
                                ["xName", "项目名称"],
                                ["contentKeyword", "内容关键字"],
                            ] as const
                        ).map(([name, label]) => (
                            <form.Field key={name} name={name}>
                                {field => (
                                    <Field className="w-full sm:w-44">
                                        <FieldLabel htmlFor={`project-${name}`}>{label}</FieldLabel>
                                        <Input id={`project-${name}`} value={field.state.value} onChange={event => field.handleChange(event.target.value)} />
                                    </Field>
                                )}
                            </form.Field>
                        ))}
                        {(
                            [
                                ["createdAfter", "创建开始日期"],
                                ["createdBefore", "创建结束日期"],
                                ["updatedAfter", "更新开始日期"],
                                ["updatedBefore", "更新结束日期"],
                            ] as const
                        ).map(([name, label]) => (
                            <form.Field key={name} name={name}>
                                {field => (
                                    <Field className="w-full sm:w-auto">
                                        <FieldLabel>{label}</FieldLabel>
                                        <DatePicker value={field.state.value} onValueChange={field.handleChange} />
                                    </Field>
                                )}
                            </form.Field>
                        ))}
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
                columnPinning={{ left: ["xName", "name"], right: ["actions"] }}
                columnSizingKey="docker-project"
                data={data?.list}
                loading={isLoading}
                pageNum={pageNum}
                pageSize={pageSize}
                sorting={sorting}
                total={data?.total}
                getRowId={row => row.name}
                onPageChange={(pageNum, pageSize) => setQuery(previous => ({ ...previous, pageNum, pageSize }))}
                onSortingChange={onSortingChange}
            />
            <ProjectLogDrawer name={logName} open={logOpen} content={logContent} onClose={onCloseLog} />
            <Dialog open={deleteOpen} onOpenChange={open => (!open ? onCloseDelete() : setDeleteOpen(true))}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{getProjectDeleteTitle(deleteTarget)}</DialogTitle>
                        <DialogDescription>请选择是否同时停止并清理项目容器。</DialogDescription>
                    </DialogHeader>
                    <DialogBody className="space-y-3">
                        <button
                            className={clsx(
                                "w-full rounded-2xl border p-4 text-left transition-colors",
                                deleteMode === ProjectDeleteMode.仅删除项目 ? "border-primary bg-primary/5" : "hover:bg-muted/50",
                            )}
                            type="button"
                            disabled={isDeletePending}
                            onClick={() => setDeleteMode(ProjectDeleteMode.仅删除项目)}
                        >
                            <div className="font-medium">仅删除项目</div>
                            <div className="mt-1 text-sm text-muted-foreground">仅删除数据库记录与本地项目目录，容器保持运行。</div>
                        </button>
                        <button
                            className={clsx(
                                "w-full rounded-2xl border p-4 text-left transition-colors",
                                deleteMode === ProjectDeleteMode.删除并清理容器 ? "border-destructive bg-destructive/5" : "hover:bg-muted/50",
                            )}
                            type="button"
                            disabled={isDeletePending}
                            onClick={() => setDeleteMode(ProjectDeleteMode.删除并清理容器)}
                        >
                            <div className="font-medium text-destructive">删除项目并清理容器</div>
                            <div className="mt-1 text-sm text-muted-foreground">先执行 docker compose down，再删除数据库记录与本地项目目录。</div>
                        </button>
                    </DialogBody>
                    <DialogFooter>
                        <Button variant="outline" disabled={isDeletePending} onClick={onCloseDelete}>
                            取消
                        </Button>
                        <Button variant="destructive" disabled={!deleteTarget?.name || isDeletePending} onClick={() => void onDeleteConfirm()}>
                            {isDeletePending && <LoaderCircleIcon className="animate-spin" />}
                            {deleteMode === ProjectDeleteMode.删除并清理容器 ? "删除并清理" : "删除"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <Dialog open={startCheckOpen} onOpenChange={open => (!open ? onCloseStartCheck() : setStartCheckOpen(true))}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>{startCheck.name ? `启动预检查：${startCheck.name}` : "启动预检查"}</DialogTitle>
                        <DialogDescription>确认宿主机挂载路径可以安全创建后再启动 Compose 项目。</DialogDescription>
                    </DialogHeader>
                    <DialogBody>
                        {isCheckProjectStartPending ? (
                            <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
                                <LoaderCircleIcon className="size-4 animate-spin" />
                                正在检查挂载路径...
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div className="rounded-2xl border bg-muted/40 p-3 text-sm">
                                    <div>已存在路径：{startCheck.data?.existsCount ?? 0}</div>
                                    <div>启动时将创建：{startCheck.data?.createCount ?? 0}</div>
                                    <div className={(startCheck.data?.blockedCount ?? 0) > 0 ? "text-destructive" : undefined}>
                                        不可创建：{startCheck.data?.blockedCount ?? 0}
                                    </div>
                                </div>
                                {(startCheck.data?.items.length ?? 0) > 0 ? (
                                    <div className="space-y-2">
                                        {startCheck.data?.items.map(item => (
                                            <ProjectStartMountItemCard
                                                key={item.key}
                                                item={item}
                                                disabled={isRunPending || isCheckProjectStartPending}
                                                onPathKindChange={onStartCheckMountPathKindChange}
                                                onCreateDirectoryChange={onStartCheckMountPathCreateDirectoryChange}
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="rounded-2xl border border-dashed bg-muted/30 px-4 py-6 text-sm text-muted-foreground">
                                        未检测到需要自动处理的挂载路径
                                    </div>
                                )}
                                {startCheck.data && !startCheck.data.canStart && (
                                    <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                                        存在不可创建的挂载路径，请先调整后再启动项目。
                                    </div>
                                )}
                            </div>
                        )}
                    </DialogBody>
                    <DialogFooter>
                        <Button variant="outline" disabled={isRunPending || isCheckProjectStartPending} onClick={onCloseStartCheck}>
                            取消
                        </Button>
                        <Button
                            disabled={!startCheck.name || !startCheck.data?.canStart || isCheckProjectStartPending || isRunPending}
                            onClick={() => void onConfirmStart()}
                        >
                            {isRunPending && <LoaderCircleIcon className="animate-spin" />}
                            确认启动
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

export default Page
