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

import { useQueryOperationLog } from "@/hooks/useQueryOperationLog"

import { getParser } from "@/schemas"
import { type OperationLogSortByParams, operationLogSortBySchema } from "@/schemas/operationLogSortBy"
import { pageNumParser } from "@/schemas/pageNum"
import { pageSizeParser } from "@/schemas/pageSize"
import { sortOrderSchema } from "@/schemas/sortOrder"
import { UserRole } from "@/schemas/userRole"

import type { OperationLog } from "@/shared/queryOperationLog"

import { formatDateTime } from "@/utils/formatDateTime"

interface OperationLogFilterValues {
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

const operationLogFilterSchema = z.object({
    action: z.string(),
    name: z.string(),
    nickname: z.string(),
    ip: z.string(),
    userAgent: z.string(),
    createdAt: z.custom<DateRange>().optional(),
})

const filterFields = [
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
        keys: ["action", "ip", "userAgent", "name", "nickname"],
        parse: {
            createdBefore: naturalParser,
            createdAfter: naturalParser,
            pageNum: pageNumParser,
            pageSize: pageSizeParser,
            sortBy: getParser(operationLogSortBySchema.optional().catch(undefined)),
            sortOrder: getParser(sortOrderSchema.optional().catch(undefined)),
        },
    })

    const [info, setInfo] = useState<InfoState>()

    const form = useForm({
        defaultValues: {
            action: query.action ?? "",
            name: query.name ?? "",
            nickname: query.nickname ?? "",
            ip: query.ip ?? "",
            userAgent: query.userAgent ?? "",
            createdAt: toDateRange(query.createdAfter, query.createdBefore),
        } as OperationLogFilterValues,
        validators: {
            onSubmit: operationLogFilterSchema,
        },
        onSubmit({ value }) {
            setQuery(previous => ({
                ...previous,
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

    const { data, isLoading } = useQueryOperationLog({
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
            action: query.action ?? "",
            name: query.name ?? "",
            nickname: query.nickname ?? "",
            ip: query.ip ?? "",
            userAgent: query.userAgent ?? "",
            createdAt: toDateRange(query.createdAfter, query.createdBefore),
        })
    }, [form, query.action, query.createdAfter, query.createdBefore, query.ip, query.name, query.nickname, query.userAgent])

    const columns: ColumnDef<OperationLog>[] = [
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
                        onClick={() => setInfo({ title: "操作参数", content: <JsonViewer value={parseJson(row.original.params!)} />, wide: true })}
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
            sortBy: next?.id as OperationLogSortByParams | undefined,
            sortOrder: next ? (next.desc ? "desc" : "asc") : undefined,
            pageNum: 1,
        }))
    }

    function onReset() {
        form.reset({ action: "", name: "", nickname: "", ip: "", userAgent: "", createdAt: undefined })

        setQuery(previous => ({
            ...previous,
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
                <h1 className="text-2xl font-semibold tracking-tight">操作日志</h1>
                <p className="text-muted-foreground mt-1 text-sm">查询系统内发生的业务操作与调用参数。</p>
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
                                        <FieldLabel htmlFor={`operation-log-filter-${name}`}>{label}</FieldLabel>
                                        <Input
                                            id={`operation-log-filter-${name}`}
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
