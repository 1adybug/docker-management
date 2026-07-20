"use client"

import { type ChangeEvent, type FC, useEffect, useRef, useState } from "react"

import { IconFileExport, IconFileImport, IconFileSpreadsheet, IconPlus } from "@tabler/icons-react"
import { useQueryClient } from "@tanstack/react-query"
import { type TableProps, Button, DatePicker, Form, Input, Popconfirm, Table } from "antd"
import { useForm } from "antd/es/form/Form"
import FormItem from "antd/es/form/FormItem"
import { getEnumKey, isNonNullable, showTotal } from "deepsea-tools"
import { type Columns, useScroll } from "soda-antd"
import type { StateToQueryFnMap } from "soda-hooks"
import { useQueryState } from "soda-next"

import { BanUserEditor } from "@/components/BanUserEditor"
import { UserEditor } from "@/components/UserEditor"

import { useDeleteUser } from "@/hooks/useDeleteUser"
import { useQueryUser } from "@/hooks/useQueryUser"
import { useUnbanUser } from "@/hooks/useUnbanUser"

import type { User } from "@/prisma/generated/client"

import { getParser } from "@/schemas"
import { pageNumParser } from "@/schemas/pageNum"
import { pageSizeParser } from "@/schemas/pageSize"
import { type SortOrderParams, sortOrderSchema } from "@/schemas/sortOrder"
import { UserRole } from "@/schemas/userRole"
import { type UserSortByParams, userSortBySchema } from "@/schemas/userSortBy"

import type { ImportUserResult } from "@/shared/importUser"

import { formatDateTime } from "@/utils/formatDateTime"
import { getSortOrder } from "@/utils/getSortOrder"
import { parseQueryDate, stringifyQueryEndDate, stringifyQueryStartDate } from "@/utils/queryDate"

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

    downloadBlob({
        blob: await response.blob(),
        filename,
    })
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

    type FormParams = typeof query

    const [form] = useForm<FormParams>()

    const [editId, setEditId] = useState<string | undefined>(undefined)
    const [banId, setBanId] = useState<string | undefined>(undefined)
    const [showEditor, setShowEditor] = useState(false)
    const [isTemplateDownloading, setIsTemplateDownloading] = useState(false)
    const [isExporting, setIsExporting] = useState(false)
    const [isImporting, setIsImporting] = useState(false)
    const container = useRef<HTMLDivElement>(null)
    const importInput = useRef<HTMLInputElement>(null)
    const { y } = useScroll(container, { paginationMargin: 32 })
    const { createdAfter, createdBefore, updatedAfter, updatedBefore, pageNum, pageSize, ...rest } = query

    useEffect(() => {
        form.resetFields()

        form.setFieldsValue({
            name: query.name,
            phoneNumber: query.phoneNumber,
            createdAt: query.createdAt,
            updatedAt: query.updatedAt,
        })
    }, [form, query])

    const columns: Columns<User> = [
        {
            title: "序号",
            key: "index",
            align: "center",
            fixed: "left",
            render: (value, record, index) => (pageNum - 1) * pageSize + index + 1,
        },
        {
            title: "用户名",
            dataIndex: "name",
            align: "center",
            fixed: "left",
            sorter: true,
            sortOrder: getSortOrder(query, "name"),
        },
        {
            title: "昵称",
            dataIndex: "nickname",
            align: "center",
            fixed: "left",
            sorter: true,
            sortOrder: getSortOrder(query, "nickname"),
        },
        {
            title: "手机号",
            dataIndex: "phoneNumber",
            align: "center",
            sorter: true,
            sortOrder: getSortOrder(query, "phoneNumber"),
        },
        {
            title: "角色",
            dataIndex: "role",
            align: "center",
            sorter: true,
            sortOrder: getSortOrder(query, "role"),
            render(value) {
                return getEnumKey(UserRole, value)
            },
        },
        {
            title: "状态",
            dataIndex: "banned",
            align: "center",
            sorter: true,
            sortOrder: getSortOrder(query, "banned"),
            render(value) {
                return value ? "已封禁" : "正常"
            },
        },
        {
            title: "封禁原因",
            dataIndex: "banReason",
            align: "center",
        },
        {
            title: "封禁时间",
            dataIndex: "banExpires",
            align: "center",
            render(value, record) {
                return value ? formatDateTime(value) : record.banned ? "永久" : "未封禁"
            },
        },
        {
            title: "创建时间",
            dataIndex: "createdAt",
            align: "center",
            sorter: true,
            sortOrder: getSortOrder(query, "createdAt"),
            render(value) {
                return formatDateTime(value)
            },
        },
        {
            title: "更新时间",
            dataIndex: "updatedAt",
            align: "center",
            sorter: true,
            sortOrder: getSortOrder(query, "updatedAt"),
            render(value) {
                return formatDateTime(value)
            },
        },
        {
            title: "操作",
            key: "operation",
            dataIndex: "id",
            align: "center",
            fixed: "right",
            render(value, record) {
                return (
                    <div className="inline-flex gap-1">
                        <Button size="small" color="primary" variant="text" disabled={isRequesting} onClick={() => onUpdate(value)}>
                            编辑
                        </Button>
                        {record.banned ? (
                            <Popconfirm title="确认解封用户" onConfirm={() => unbanUserAsync(value)}>
                                <Button size="small" color="orange" variant="text" disabled={isRequesting}>
                                    解封
                                </Button>
                            </Popconfirm>
                        ) : (
                            <Button size="small" color="orange" variant="text" disabled={isRequesting} onClick={() => onBan(value)}>
                                封禁
                            </Button>
                        )}
                        <Popconfirm title="确认删除用户" description="请在删除用户前，确保已备份相关数据" onConfirm={() => deleteUserAsync(value)}>
                            <Button size="small" color="danger" variant="text" disabled={isRequesting}>
                                删除
                            </Button>
                        </Popconfirm>
                    </div>
                )
            },
        },
    ]

    function onAdd() {
        setEditId(undefined)
        setShowEditor(true)
    }

    function onUpdate(id: string) {
        setEditId(id)
        setShowEditor(true)
    }

    function onBan(id: string) {
        setBanId(id)
    }

    function onClose() {
        setEditId(undefined)
        setShowEditor(false)
    }

    function onImport() {
        importInput.current?.click()
    }

    function getExportParams() {
        const { createdAfter, createdBefore, updatedAfter, updatedBefore, pageNum, pageSize, ...params } = query

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
            await downloadWorkbookResponse({
                response: await fetch("/api/admin/user/template"),
                filename: "用户导入模板.xlsx",
            })
        } catch (error) {
            message.open({
                type: "error",
                content: getErrorMessage(error),
            })
        } finally {
            setIsTemplateDownloading(false)
        }
    }

    async function onExport() {
        setIsExporting(true)

        try {
            await downloadWorkbookResponse({
                response: await fetch("/api/admin/user/export", {
                    method: "POST",
                    body: JSON.stringify(getExportParams()),
                }),
                filename: "用户列表.xlsx",
            })
        } catch (error) {
            message.open({
                type: "error",
                content: getErrorMessage(error),
            })
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

            const response = await fetch("/api/admin/user/import", {
                method: "POST",
                body: formData,
            })
            const result = await readActionResponse<ImportUserResult>(response)

            if (!response.ok || !result.success) throw new Error(result.message || "批量导入失败")

            await queryClient.invalidateQueries({ queryKey: ["query-user"] })

            if (result.data?.resultWorkbookBase64) {
                downloadBase64Workbook({
                    base64: result.data.resultWorkbookBase64,
                    filename: result.data.resultFilename || "用户导入结果.xlsx",
                })
            }

            message.open({
                type: "success",
                content: getImportResultMessage(result.data),
            })
        } catch (error) {
            message.open({
                type: "error",
                content: getErrorMessage(error),
            })
        } finally {
            setIsImporting(false)
        }
    }

    const { data, isLoading } = useQueryUser({
        createdAfter: createdAfter?.toDate(),
        createdBefore: createdBefore?.toDate(),
        updatedAfter: updatedAfter?.toDate(),
        updatedBefore: updatedBefore?.toDate(),
        pageNum,
        pageSize,
        ...rest,
    })

    const { mutateAsync: unbanUserAsync, isPending: isUnbanUserPending } = useUnbanUser()
    const { mutateAsync: deleteUserAsync, isPending: isDeleteUserPending } = useDeleteUser()

    const isRequesting = isLoading || isUnbanUserPending || isDeleteUserPending || isTemplateDownloading || isExporting || isImporting

    function onReset() {
        form.resetFields()
        setQuery({} as FormParams)
    }

    const onChange: TableProps<User>["onChange"] = function onChange(pagination, filters, sorter, extra) {
        if (Array.isArray(sorter)) return

        setQuery(prev => ({
            ...prev,
            sortBy: sorter.field as UserSortByParams,
            sortOrder: (sorter.order ? sorter.order.slice(0, -3) : undefined) as SortOrderParams,
        }))
    }

    return (
        <div className="flex h-full flex-col gap-4 pt-4">
            <input
                ref={importInput}
                className="hidden"
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={onImportFileChange}
            />
            <div className="flex-none px-4">
                <Form<FormParams> name="query-user-form" form={form} className="gap-y-4" layout="inline" onFinish={setQuery}>
                    <FormItem<FormParams> name="name" label="用户名">
                        <Input />
                    </FormItem>
                    <FormItem<FormParams> name="nickname" label="昵称">
                        <Input />
                    </FormItem>
                    <FormItem<FormParams> name="phoneNumber" label="手机号">
                        <Input />
                    </FormItem>
                    <FormItem<FormParams> name="createdAfter" label="创建开始日期">
                        <DatePicker />
                    </FormItem>
                    <FormItem<FormParams> name="createdBefore" label="创建结束日期">
                        <DatePicker />
                    </FormItem>
                    <FormItem<FormParams> name="updatedAfter" label="更新开始日期">
                        <DatePicker />
                    </FormItem>
                    <FormItem<FormParams> name="updatedBefore" label="更新结束日期">
                        <DatePicker />
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
                    <div className="ml-auto flex flex-none flex-wrap gap-2">
                        <Button
                            htmlType="button"
                            icon={<IconFileSpreadsheet size={16} />}
                            disabled={isRequesting}
                            loading={isTemplateDownloading}
                            onClick={onDownloadTemplate}
                        >
                            下载模板
                        </Button>
                        <Button htmlType="button" icon={<IconFileImport size={16} />} disabled={isRequesting} loading={isImporting} onClick={onImport}>
                            批量导入
                        </Button>
                        <Button htmlType="button" icon={<IconFileExport size={16} />} disabled={isRequesting} loading={isExporting} onClick={onExport}>
                            批量导出
                        </Button>
                        <Button htmlType="button" color="primary" icon={<IconPlus size={16} />} disabled={isRequesting} onClick={onAdd}>
                            新增
                        </Button>
                    </div>
                </Form>
            </div>
            <div ref={container} className="px-4 fill-y">
                <UserEditor id={editId} open={showEditor} onClose={onClose} />
                <BanUserEditor id={banId} open={isNonNullable(banId)} onClose={() => setBanId(undefined)} />
                <Table<User>
                    columns={columns}
                    dataSource={data?.list}
                    loading={isLoading}
                    rowKey="id"
                    onChange={onChange}
                    scroll={{ x: "max-content", y }}
                    pagination={{
                        current: pageNum,
                        pageSize,
                        total: data?.total,
                        showTotal,
                        showSizeChanger: true,
                        onChange(page, pageSize) {
                            setQuery(prev => ({ ...prev, pageNum: page, pageSize }))
                        },
                    }}
                />
            </div>
        </div>
    )
}

export default Page
