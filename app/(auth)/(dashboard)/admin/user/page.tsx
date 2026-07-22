"use client"

import { type ChangeEvent, type FC, useEffect, useRef, useState } from "react"

import { useForm } from "@tanstack/react-form"
import { useQueryClient } from "@tanstack/react-query"
import type { ColumnDef, SortingState, Updater } from "@tanstack/react-table"
import { getEnumKey } from "deepsea-tools"
import { DownloadIcon, FileSpreadsheetIcon, LoaderCircleIcon, PlusIcon, UploadIcon } from "lucide-react"
import type { StateToQueryFnMap } from "soda-hooks"
import { useQueryState } from "soda-next"
import { z } from "zod"

import { BanUserEditor } from "@/components/BanUserEditor"
import { ConfirmButton } from "@/components/ConfirmButton"
import { DataTable } from "@/components/DataTable"
import { DatePicker } from "@/components/DatePicker"
import { UserEditor } from "@/components/UserEditor"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

import { useDeleteUser } from "@/hooks/useDeleteUser"
import { useQueryUser } from "@/hooks/useQueryUser"
import { useUnbanUser } from "@/hooks/useUnbanUser"

import type { User } from "@/prisma/generated/client"

import { getParser } from "@/schemas"
import { pageNumParser } from "@/schemas/pageNum"
import { pageSizeParser } from "@/schemas/pageSize"
import { sortOrderSchema } from "@/schemas/sortOrder"
import { UserRole } from "@/schemas/userRole"
import { type UserSortByParams, userSortBySchema } from "@/schemas/userSortBy"

import type { ImportUserResult } from "@/shared/importUser"

import { formatDateTime } from "@/utils/formatDateTime"
import { parseQueryDate, stringifyQueryEndDate, stringifyQueryStartDate } from "@/utils/queryDate"
import { toast } from "@/utils/toast"

interface ActionResponse<T = unknown> {
    success: boolean
    data?: T
    message?: string
}

interface DownloadBlobParams {
    blob: Blob
    filename: string
}

interface DownloadWorkbookResponseParams {
    response: Response
    filename: string
}

interface DownloadBase64WorkbookParams {
    base64: string
    filename: string
}

interface UserFilterValues {
    name: string
    nickname: string
    phoneNumber: string
    createdAfter?: Date
    createdBefore?: Date
    updatedAfter?: Date
    updatedBefore?: Date
}

const userFilterSchema = z.object({
    name: z.string(),
    nickname: z.string(),
    phoneNumber: z.string(),
    createdAfter: z.custom<Date>().optional(),
    createdBefore: z.custom<Date>().optional(),
    updatedAfter: z.custom<Date>().optional(),
    updatedBefore: z.custom<Date>().optional(),
})

const filterFields = [
    { name: "name", label: "用户名" },
    { name: "nickname", label: "昵称" },
    { name: "phoneNumber", label: "手机号" },
] as const

function getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : "操作失败"
}

function downloadBlob({ blob, filename }: DownloadBlobParams) {
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    document.body.append(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
}

async function readActionResponse<T>(response: Response) {
    return (await response.json()) as ActionResponse<T>
}

async function downloadWorkbookResponse({ response, filename }: DownloadWorkbookResponseParams) {
    const contentType = response.headers.get("content-type") ?? ""

    if (contentType.includes("application/json")) {
        const result = await readActionResponse(response)
        throw new Error(result.message || "下载失败")
    }

    if (!response.ok) throw new Error("下载失败")
    downloadBlob({ blob: await response.blob(), filename })
}

function downloadBase64Workbook({ base64, filename }: DownloadBase64WorkbookParams) {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index)

    downloadBlob({
        blob: new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
        filename,
    })
}

function getImportResultMessage(result?: ImportUserResult) {
    if (!result) return "批量导入成功"
    return `成功添加 ${result.successCount} 个，与现有库重复 ${result.duplicateCount} 个（用户名），信息错误 ${result.errorCount} 个。`
}

const queryParsers = {
    createdBefore: parseQueryDate,
    createdAfter: parseQueryDate,
    updatedBefore: parseQueryDate,
    updatedAfter: parseQueryDate,
    pageNum: pageNumParser,
    pageSize: pageSizeParser,
    sortBy: getParser(userSortBySchema.optional().catch(undefined)),
    sortOrder: getParser(sortOrderSchema.optional().catch(undefined)),
}

const queryStringifiers: StateToQueryFnMap<typeof queryParsers> = {
    createdBefore: stringifyQueryEndDate,
    createdAfter: stringifyQueryStartDate,
    updatedBefore: stringifyQueryEndDate,
    updatedAfter: stringifyQueryStartDate,
}

const Page: FC = () => {
    const queryClient = useQueryClient()

    const [query, setQuery] = useQueryState({
        keys: ["id", "name", "nickname", "email", "phoneNumber"],
        parse: queryParsers,
        stringify: queryStringifiers,
    })

    const [editId, setEditId] = useState<string>()
    const [banId, setBanId] = useState<string>()
    const [showEditor, setShowEditor] = useState(false)
    const [isTemplateDownloading, setIsTemplateDownloading] = useState(false)
    const [isExporting, setIsExporting] = useState(false)
    const [isImporting, setIsImporting] = useState(false)
    const importInput = useRef<HTMLInputElement>(null)

    const form = useForm({
        defaultValues: {
            name: query.name ?? "",
            nickname: query.nickname ?? "",
            phoneNumber: query.phoneNumber ?? "",
            createdAfter: query.createdAfter,
            createdBefore: query.createdBefore,
            updatedAfter: query.updatedAfter,
            updatedBefore: query.updatedBefore,
        } as UserFilterValues,
        validators: {
            onSubmit: userFilterSchema,
        },
        onSubmit({ value }) {
            setQuery(previous => ({
                ...previous,
                name: value.name.trim() || undefined,
                nickname: value.nickname.trim() || undefined,
                phoneNumber: value.phoneNumber.trim() || undefined,
                createdAfter: value.createdAfter,
                createdBefore: value.createdBefore,
                updatedAfter: value.updatedAfter,
                updatedBefore: value.updatedBefore,
                pageNum: 1,
            }))
        },
    })

    const { data, isLoading } = useQueryUser({
        id: query.id,
        name: query.name,
        nickname: query.nickname,
        email: query.email,
        phoneNumber: query.phoneNumber,
        createdAfter: query.createdAfter,
        createdBefore: query.createdBefore,
        updatedAfter: query.updatedAfter,
        updatedBefore: query.updatedBefore,
        pageNum: query.pageNum,
        pageSize: query.pageSize,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
    })

    const { mutateAsync: unbanUser, isPending: isUnbanUserPending } = useUnbanUser()
    const { mutateAsync: deleteUser, isPending: isDeleteUserPending } = useDeleteUser()
    const isRequesting = isLoading || isUnbanUserPending || isDeleteUserPending || isTemplateDownloading || isExporting || isImporting
    const sorting: SortingState = query.sortBy ? [{ id: query.sortBy, desc: query.sortOrder === "desc" }] : []

    useEffect(() => {
        form.reset({
            name: query.name ?? "",
            nickname: query.nickname ?? "",
            phoneNumber: query.phoneNumber ?? "",
            createdAfter: query.createdAfter,
            createdBefore: query.createdBefore,
            updatedAfter: query.updatedAfter,
            updatedBefore: query.updatedBefore,
        })
    }, [form, query.createdAfter, query.createdBefore, query.name, query.nickname, query.phoneNumber, query.updatedAfter, query.updatedBefore])

    const columns: ColumnDef<User>[] = [
        {
            id: "index",
            header: "序号",
            size: 72,
            cell: ({ row }) => (query.pageNum - 1) * query.pageSize + row.index + 1,
        },
        { accessorKey: "name", header: "用户名", enableSorting: true, size: 160 },
        { accessorKey: "nickname", header: "昵称", enableSorting: true, size: 160 },
        { accessorKey: "phoneNumber", header: "手机号", enableSorting: true },
        {
            accessorKey: "role",
            header: "角色",
            enableSorting: true,
            cell: ({ row }) => getEnumKey(UserRole, row.original.role),
        },
        {
            accessorKey: "banned",
            header: "状态",
            enableSorting: true,
            cell: ({ row }) => <Badge variant={row.original.banned ? "destructive" : "secondary"}>{row.original.banned ? "已封禁" : "正常"}</Badge>,
        },
        { accessorKey: "banReason", header: "封禁原因" },
        {
            accessorKey: "banExpires",
            header: "封禁时间",
            cell: ({ row }) => (row.original.banExpires ? formatDateTime(row.original.banExpires) : row.original.banned ? "永久" : "未封禁"),
        },
        {
            accessorKey: "createdAt",
            header: "创建时间",
            enableSorting: true,
            cell: ({ row }) => formatDateTime(row.original.createdAt),
        },
        {
            accessorKey: "updatedAt",
            header: "更新时间",
            enableSorting: true,
            cell: ({ row }) => formatDateTime(row.original.updatedAt),
        },
        {
            id: "actions",
            header: "操作",
            size: 200,
            cell: ({ row }) => (
                <div className="flex items-center gap-1">
                    <Button
                        size="xs"
                        variant="ghost"
                        disabled={isRequesting}
                        onClick={() => {
                            setEditId(row.original.id)
                            setShowEditor(true)
                        }}
                    >
                        编辑
                    </Button>
                    {row.original.banned ? (
                        <ConfirmButton title="确认解封用户" size="xs" variant="ghost" pending={isUnbanUserPending} onConfirm={() => unbanUser(row.original.id)}>
                            解封
                        </ConfirmButton>
                    ) : (
                        <Button size="xs" variant="ghost" disabled={isRequesting} onClick={() => setBanId(row.original.id)}>
                            封禁
                        </Button>
                    )}
                    <ConfirmButton
                        title="确认删除用户"
                        description="请在删除用户前确保已备份相关数据，此操作不可撤销。"
                        size="xs"
                        variant="destructive"
                        pending={isDeleteUserPending}
                        onConfirm={() => deleteUser(row.original.id)}
                    >
                        删除
                    </ConfirmButton>
                </div>
            ),
        },
    ]

    function onSortingChange(updater: Updater<SortingState>) {
        const nextSorting = typeof updater === "function" ? updater(sorting) : updater
        const next = nextSorting[0]

        setQuery(previous => ({
            ...previous,
            sortBy: next?.id as UserSortByParams | undefined,
            sortOrder: next ? (next.desc ? "desc" : "asc") : undefined,
            pageNum: 1,
        }))
    }

    function onReset() {
        form.reset({
            name: "",
            nickname: "",
            phoneNumber: "",
            createdAfter: undefined,
            createdBefore: undefined,
            updatedAfter: undefined,
            updatedBefore: undefined,
        })

        setQuery(previous => ({
            ...previous,
            name: undefined,
            nickname: undefined,
            phoneNumber: undefined,
            createdAfter: undefined,
            createdBefore: undefined,
            updatedAfter: undefined,
            updatedBefore: undefined,
            pageNum: 1,
        }))
    }

    function getExportParams() {
        const { pageNum, pageSize, createdAfter, createdBefore, updatedAfter, updatedBefore, ...params } = query
        return {
            ...params,
            createdAfter: createdAfter?.toISOString(),
            createdBefore: createdBefore?.toISOString(),
            updatedAfter: updatedAfter?.toISOString(),
            updatedBefore: updatedBefore?.toISOString(),
        }
    }

    async function onDownloadTemplate() {
        setIsTemplateDownloading(true)

        try {
            await downloadWorkbookResponse({ response: await fetch("/api/admin/user/template"), filename: "用户导入模板.xlsx" })
        } catch (error) {
            toast.error(getErrorMessage(error))
        } finally {
            setIsTemplateDownloading(false)
        }
    }

    async function onExport() {
        setIsExporting(true)

        try {
            await downloadWorkbookResponse({
                response: await fetch("/api/admin/user/export", { method: "POST", body: JSON.stringify(getExportParams()) }),
                filename: "用户列表.xlsx",
            })
        } catch (error) {
            toast.error(getErrorMessage(error))
        } finally {
            setIsExporting(false)
        }
    }

    async function onImportFileChange(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0]
        event.target.value = ""
        if (!file) return

        setIsImporting(true)

        try {
            const formData = new FormData()
            formData.set("file", file)
            const response = await fetch("/api/admin/user/import", { method: "POST", body: formData })
            const result = await readActionResponse<ImportUserResult>(response)
            if (!response.ok || !result.success) throw new Error(result.message || "批量导入失败")

            await queryClient.invalidateQueries({ queryKey: ["query-user"] })

            if (result.data?.resultWorkbookBase64) {
                downloadBase64Workbook({
                    base64: result.data.resultWorkbookBase64,
                    filename: result.data.resultFilename || "用户导入结果.xlsx",
                })
            }

            toast.success(getImportResultMessage(result.data))
        } catch (error) {
            toast.error(getErrorMessage(error))
        } finally {
            setIsImporting(false)
        }
    }

    return (
        <div className="space-y-6">
            <input
                ref={importInput}
                hidden
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={onImportFileChange}
            />
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">用户管理</h1>
                    <p className="mt-1 text-sm text-muted-foreground">管理用户资料、状态与批量数据。</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" disabled={isRequesting} onClick={() => void onDownloadTemplate()}>
                        {isTemplateDownloading ? <LoaderCircleIcon className="animate-spin" /> : <FileSpreadsheetIcon />}
                        下载模板
                    </Button>
                    <Button variant="outline" disabled={isRequesting} onClick={() => importInput.current?.click()}>
                        {isImporting ? <LoaderCircleIcon className="animate-spin" /> : <UploadIcon />}
                        批量导入
                    </Button>
                    <Button variant="outline" disabled={isRequesting} onClick={() => void onExport()}>
                        {isExporting ? <LoaderCircleIcon className="animate-spin" /> : <DownloadIcon />}
                        批量导出
                    </Button>
                    <Button
                        disabled={isRequesting}
                        onClick={() => {
                            setEditId(undefined)
                            setShowEditor(true)
                        }}
                    >
                        <PlusIcon />
                        新增用户
                    </Button>
                </div>
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
                        {filterFields.map(({ name, label }) => (
                            <form.Field key={name} name={name}>
                                {field => (
                                    <Field className="w-full sm:w-44">
                                        <FieldLabel htmlFor={`user-filter-${name}`}>{label}</FieldLabel>
                                        <Input
                                            id={`user-filter-${name}`}
                                            value={field.state.value}
                                            onChange={event => field.handleChange(event.target.value)}
                                        />
                                    </Field>
                                )}
                            </form.Field>
                        ))}
                        <form.Field name="createdAfter">
                            {field => (
                                <Field className="w-full sm:w-auto">
                                    <FieldLabel>创建开始日期</FieldLabel>
                                    <DatePicker value={field.state.value} onValueChange={field.handleChange} />
                                </Field>
                            )}
                        </form.Field>
                        <form.Field name="createdBefore">
                            {field => (
                                <Field className="w-full sm:w-auto">
                                    <FieldLabel>创建结束日期</FieldLabel>
                                    <DatePicker value={field.state.value} onValueChange={field.handleChange} />
                                </Field>
                            )}
                        </form.Field>
                        <form.Field name="updatedAfter">
                            {field => (
                                <Field className="w-full sm:w-auto">
                                    <FieldLabel>更新开始日期</FieldLabel>
                                    <DatePicker value={field.state.value} onValueChange={field.handleChange} />
                                </Field>
                            )}
                        </form.Field>
                        <form.Field name="updatedBefore">
                            {field => (
                                <Field className="w-full sm:w-auto">
                                    <FieldLabel>更新结束日期</FieldLabel>
                                    <DatePicker value={field.state.value} onValueChange={field.handleChange} />
                                </Field>
                            )}
                        </form.Field>
                        <form.Subscribe selector={state => [state.canSubmit, state.isSubmitting, state.isPristine]}>
                            {([canSubmit, isSubmitting, isPristine]) => (
                                <Button type="submit" disabled={!canSubmit || isRequesting || isSubmitting || isPristine}>
                                    查询
                                </Button>
                            )}
                        </form.Subscribe>
                        <Button type="button" variant="ghost" disabled={isRequesting} onClick={onReset}>
                            重置
                        </Button>
                    </form>
                </CardContent>
            </Card>
            <DataTable
                columns={columns}
                columnPinning={{ left: ["index", "name", "nickname"], right: ["actions"] }}
                columnSizingKey="admin-user"
                data={data?.list}
                loading={isLoading}
                pageNum={query.pageNum}
                pageSize={query.pageSize}
                sorting={sorting}
                total={data?.total}
                getRowId={user => user.id}
                onPageChange={(pageNum, pageSize) => setQuery(previous => ({ ...previous, pageNum, pageSize }))}
                onSortingChange={onSortingChange}
            />
            <UserEditor
                id={editId}
                open={showEditor}
                onClose={() => {
                    setEditId(undefined)
                    setShowEditor(false)
                }}
            />
            <BanUserEditor id={banId} open={!!banId} onClose={() => setBanId(undefined)} />
        </div>
    )
}

export default Page
