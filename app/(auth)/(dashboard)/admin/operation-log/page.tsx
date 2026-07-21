"use client"

import { type FC, type ReactNode, useEffect, useState } from "react"

import { useForm } from "@tanstack/react-form"
import type { ColumnDef, SortingState, Updater } from "@tanstack/react-table"
import { getEnumKey } from "deepsea-tools"
import type { StateToQueryFnMap } from "soda-hooks"
import { useQueryState } from "soda-next"
import { z } from "zod"

import { DataTable } from "@/components/DataTable"
import { DatePicker } from "@/components/DatePicker"
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
import { parseQueryDate, stringifyQueryEndDate, stringifyQueryStartDate } from "@/utils/queryDate"

interface OperationLogFilterValues {
    action: string
    name: string
    nickname: string
    ip: string
    userAgent: string
    createdAfter?: Date
    createdBefore?: Date
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
    createdAfter: z.custom<Date>().optional(),
    createdBefore: z.custom<Date>().optional(),
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

const queryParsers = {
    createdBefore: parseQueryDate,
    createdAfter: parseQueryDate,
    pageNum: pageNumParser,
    pageSize: pageSizeParser,
    sortBy: getParser(operationLogSortBySchema.optional().catch(undefined)),
    sortOrder: getParser(sortOrderSchema.optional().catch(undefined)),
}

const queryStringifiers: StateToQueryFnMap<typeof queryParsers> = {
    createdBefore: stringifyQueryEndDate,
    createdAfter: stringifyQueryStartDate,
}

const Page: FC = () => {
    const [query, setQuery] = useQueryState({
        keys: ["action", "ip", "userAgent", "name", "nickname"],
        parse: queryParsers,
        stringify: queryStringifiers,
    })

    const [info, setInfo] = useState<InfoState>()

    const form = useForm({
        defaultValues: {
            action: query.action ?? "",
            name: query.name ?? "",
            nickname: query.nickname ?? "",
            ip: query.ip ?? "",
            userAgent: query.userAgent ?? "",
            createdAfter: query.createdAfter,
            createdBefore: query.createdBefore,
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
                createdAfter: value.createdAfter,
                createdBefore: value.createdBefore,
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
        createdAfter: query.createdAfter,
        createdBefore: query.createdBefore,
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
            createdAfter: query.createdAfter,
            createdBefore: query.createdBefore,
        })
    }, [form, query.action, query.createdAfter, query.createdBefore, query.ip, query.name, query.nickname, query.userAgent])

    const columns: ColumnDef<OperationLog>[] = [
        {
            id: "index",
            header: "序号",
            size: 72,
            cell: ({ row }) => (query.pageNum - 1) * query.pageSize + row.index + 1,
        },
        {
            accessorKey: "name",
            header: "用户",
            enableSorting: true,
            size: 160,
            cell: ({ row }) => (row.original.userId && row.original.name ? <UserButton data={{ id: row.original.userId, name: row.original.name }} /> : "-"),
        },
        { accessorKey: "nickname", header: "昵称", enableSorting: true, size: 160 },
        { accessorKey: "phoneNumber", header: "手机号" },
        {
            accessorKey: "role",
            header: "角色",
            cell: ({ row }) => (row.original.role ? getEnumKey(UserRole, row.original.role) : "-"),
        },
        {
            accessorKey: "params",
            header: "参数",
            cell: ({ row }) =>
                row.original.params ? (
                    <Button
                        className="h-6 max-w-48 justify-start truncate px-0"
                        variant="link"
                        size="sm"
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
                        className="h-6 max-w-48 justify-start truncate px-0"
                        variant="link"
                        size="sm"
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
        { accessorKey: "action", header: "操作", enableSorting: true, size: 160 },
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
        form.reset({
            action: "",
            name: "",
            nickname: "",
            ip: "",
            userAgent: "",
            createdAfter: undefined,
            createdBefore: undefined,
        })

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
                <p className="mt-1 text-sm text-muted-foreground">查询系统内发生的业务操作与调用参数。</p>
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
                columnPinning={{ left: ["index", "name", "nickname"], right: ["action"] }}
                columnSizingKey="admin-operation-log"
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
