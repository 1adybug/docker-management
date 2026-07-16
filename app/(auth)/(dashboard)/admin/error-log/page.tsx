"use client"

import { type FC, type ReactNode, useEffect, useState } from "react"

import { useForm } from "@tanstack/react-form"
import type { ColumnDef, SortingState, Updater } from "@tanstack/react-table"
import { getEnumKey, naturalParser } from "deepsea-tools"
import type { DateRange } from "react-day-picker"
import { useQueryState } from "soda-next"
import { z } from "zod"

import { DataTable } from "@/components/DataTable"
import { DateRangePicker } from "@/components/DateRangePicker"
import { InfoDialog } from "@/components/InfoDialog"
import { JsonViewer } from "@/components/JsonViewer"
import { UserButton } from "@/components/UserButton"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

import { useQueryErrorLog } from "@/hooks/useQueryErrorLog"

import { getParser } from "@/schemas"
import { type ErrorLogSortByParams, errorLogSortBySchema } from "@/schemas/errorLogSortBy"
import { pageNumParser } from "@/schemas/pageNum"
import { pageSizeParser } from "@/schemas/pageSize"
import { sortOrderSchema } from "@/schemas/sortOrder"
import { UserRole } from "@/schemas/userRole"

import type { ErrorLog } from "@/shared/queryErrorLog"

import { formatDateTime } from "@/utils/formatDateTime"

interface ErrorLogFilterValues {
    type: string
    message: string
    action: string
    name: string
    nickname: string
    ip: string
    userAgent: string
    createdAt?: DateRange
}

interface InfoState {
    title: string
    content: ReactNode
    wide?: boolean
}

const errorLogFilterSchema = z.object({
    type: z.string(),
    message: z.string(),
    action: z.string(),
    name: z.string(),
    nickname: z.string(),
    ip: z.string(),
    userAgent: z.string(),
    createdAt: z.custom<DateRange>().optional(),
})

const filterFields = [
    { name: "type", label: "类型" },
    { name: "message", label: "消息" },
    { name: "action", label: "函数名" },
    { name: "name", label: "用户名" },
    { name: "nickname", label: "昵称" },
    { name: "ip", label: "IP" },
    { name: "userAgent", label: "UserAgent" },
] as const

function parseJson(value: string) {
    try {
        return JSON.parse(value)
    } catch {
        return value
    }
}

function toDateRange(after?: number, before?: number): DateRange | undefined {
    if (!after && !before) return undefined
    return { from: after ? new Date(after) : undefined, to: before ? new Date(before) : undefined }
}

const Page: FC = () => {
    const [query, setQuery] = useQueryState({
        keys: ["type", "message", "action", "ip", "userAgent", "name", "nickname"],
        parse: {
            createdBefore: naturalParser,
            createdAfter: naturalParser,
            pageNum: pageNumParser,
            pageSize: pageSizeParser,
            sortBy: getParser(errorLogSortBySchema.optional().catch(undefined)),
            sortOrder: getParser(sortOrderSchema.optional().catch(undefined)),
        },
    })

    const [info, setInfo] = useState<InfoState>()

    const form = useForm({
        defaultValues: {
            type: query.type ?? "",
            message: query.message ?? "",
            action: query.action ?? "",
            name: query.name ?? "",
            nickname: query.nickname ?? "",
            ip: query.ip ?? "",
            userAgent: query.userAgent ?? "",
            createdAt: toDateRange(query.createdAfter, query.createdBefore),
        } as ErrorLogFilterValues,
        validators: {
            onSubmit: errorLogFilterSchema,
        },
        onSubmit({ value }) {
            setQuery(previous => ({
                ...previous,
                type: value.type.trim() || undefined,
                message: value.message.trim() || undefined,
                action: value.action.trim() || undefined,
                name: value.name.trim() || undefined,
                nickname: value.nickname.trim() || undefined,
                ip: value.ip.trim() || undefined,
                userAgent: value.userAgent.trim() || undefined,
                createdAfter: value.createdAt?.from?.getTime(),
                createdBefore: value.createdAt?.to?.getTime(),
                pageNum: 1,
            }))
        },
    })

    const { data, isLoading } = useQueryErrorLog({
        type: query.type,
        message: query.message,
        action: query.action,
        name: query.name,
        nickname: query.nickname,
        ip: query.ip,
        userAgent: query.userAgent,
        createdAfter: query.createdAfter ? new Date(query.createdAfter) : undefined,
        createdBefore: query.createdBefore ? new Date(query.createdBefore) : undefined,
        pageNum: query.pageNum,
        pageSize: query.pageSize,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
    })

    const sorting: SortingState = query.sortBy ? [{ id: query.sortBy, desc: query.sortOrder === "desc" }] : []

    useEffect(() => {
        form.reset({
            type: query.type ?? "",
            message: query.message ?? "",
            action: query.action ?? "",
            name: query.name ?? "",
            nickname: query.nickname ?? "",
            ip: query.ip ?? "",
            userAgent: query.userAgent ?? "",
            createdAt: toDateRange(query.createdAfter, query.createdBefore),
        })
    }, [form, query.action, query.createdAfter, query.createdBefore, query.ip, query.message, query.name, query.nickname, query.type, query.userAgent])

    const columns: ColumnDef<ErrorLog>[] = [
        {
            id: "index",
            header: "序号",
            cell: ({ row }) => (query.pageNum - 1) * query.pageSize + row.index + 1,
        },
        {
            accessorKey: "name",
            header: "用户",
            enableSorting: true,
            cell: ({ row }) => (row.original.userId && row.original.name ? <UserButton data={{ id: row.original.userId, name: row.original.name }} /> : "-"),
        },
        { accessorKey: "nickname", header: "昵称", enableSorting: true },
        { accessorKey: "phoneNumber", header: "手机号" },
        {
            accessorKey: "role",
            header: "角色",
            cell: ({ row }) => (row.original.role ? getEnumKey(UserRole, row.original.role) : "-"),
        },
        { accessorKey: "type", header: "类型", enableSorting: true },
        {
            accessorKey: "message",
            header: "消息",
            enableSorting: true,
            cell: ({ row }) => (
                <Button
                    className="max-w-48 justify-start truncate px-0"
                    variant="link"
                    size="xs"
                    onClick={() => setInfo({ title: "错误消息", content: row.original.message })}
                >
                    {row.original.message}
                </Button>
            ),
        },
        {
            accessorKey: "stack",
            header: "堆栈",
            cell: ({ row }) =>
                row.original.stack ? (
                    <Button
                        className="max-w-48 justify-start truncate px-0"
                        variant="link"
                        size="xs"
                        onClick={() => setInfo({ title: "错误堆栈", content: row.original.stack, wide: true })}
                    >
                        {row.original.stack}
                    </Button>
                ) : (
                    "-"
                ),
        },
        { accessorKey: "action", header: "操作", enableSorting: true },
        {
            accessorKey: "params",
            header: "参数",
            cell: ({ row }) =>
                row.original.params ? (
                    <Button
                        className="max-w-48 justify-start truncate px-0"
                        variant="link"
                        size="xs"
                        onClick={() => setInfo({ title: "错误参数", content: <JsonViewer value={parseJson(row.original.params!)} />, wide: true })}
                    >
                        {row.original.params}
                    </Button>
                ) : (
                    "-"
                ),
        },
        { accessorKey: "ip", header: "IP", enableSorting: true },
        {
            accessorKey: "userAgent",
            header: "UserAgent",
            enableSorting: true,
            cell: ({ row }) =>
                row.original.userAgent ? (
                    <Button
                        className="max-w-48 justify-start truncate px-0"
                        variant="link"
                        size="xs"
                        onClick={() => setInfo({ title: "UserAgent", content: row.original.userAgent })}
                    >
                        {row.original.userAgent}
                    </Button>
                ) : (
                    "-"
                ),
        },
        {
            accessorKey: "createdAt",
            header: "时间",
            enableSorting: true,
            cell: ({ row }) => formatDateTime(row.original.createdAt),
        },
    ]

    function onSortingChange(updater: Updater<SortingState>) {
        const nextSorting = typeof updater === "function" ? updater(sorting) : updater
        const next = nextSorting[0]

        setQuery(previous => ({
            ...previous,
            sortBy: next?.id as ErrorLogSortByParams | undefined,
            sortOrder: next ? (next.desc ? "desc" : "asc") : undefined,
            pageNum: 1,
        }))
    }

    function onReset() {
        form.reset({ type: "", message: "", action: "", name: "", nickname: "", ip: "", userAgent: "", createdAt: undefined })

        setQuery(previous => ({
            ...previous,
            type: undefined,
            message: undefined,
            action: undefined,
            name: undefined,
            nickname: undefined,
            ip: undefined,
            userAgent: undefined,
            createdAfter: undefined,
            createdBefore: undefined,
            pageNum: 1,
        }))
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight">错误日志</h1>
                <p className="text-muted-foreground mt-1 text-sm">查询异常消息、调用堆栈与请求上下文。</p>
            </div>
            <Card>
                <CardContent>
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
                                        <FieldLabel htmlFor={`error-log-filter-${name}`}>{label}</FieldLabel>
                                        <Input
                                            id={`error-log-filter-${name}`}
                                            value={field.state.value}
                                            onChange={event => field.handleChange(event.target.value)}
                                        />
                                    </Field>
                                )}
                            </form.Field>
                        ))}
                        <form.Field name="createdAt">
                            {field => (
                                <Field className="w-full sm:w-auto">
                                    <FieldLabel>创建时间</FieldLabel>
                                    <DateRangePicker value={field.state.value} onValueChange={field.handleChange} />
                                </Field>
                            )}
                        </form.Field>
                        <form.Subscribe selector={state => [state.canSubmit, state.isSubmitting, state.isPristine]}>
                            {([canSubmit, isSubmitting, isPristine]) => (
                                <Button type="submit" disabled={!canSubmit || isLoading || isSubmitting || isPristine}>
                                    查询
                                </Button>
                            )}
                        </form.Subscribe>
                        <Button type="button" variant="ghost" disabled={isLoading} onClick={onReset}>
                            重置
                        </Button>
                    </form>
                </CardContent>
            </Card>
            <DataTable
                columns={columns}
                data={data?.list}
                loading={isLoading}
                pageNum={query.pageNum}
                pageSize={query.pageSize}
                sorting={sorting}
                total={data?.total}
                getRowId={log => log.id}
                onPageChange={(pageNum, pageSize) => setQuery(previous => ({ ...previous, pageNum, pageSize }))}
                onSortingChange={onSortingChange}
            />
            <InfoDialog title={info?.title} open={!!info} wide={info?.wide} onClose={() => setInfo(undefined)}>
                {info?.content}
            </InfoDialog>
        </div>
    )
}

export default Page
