"use client"

import { type FC, useEffect, useRef, useState } from "react"

import { type ModalProps, type TableProps, Button, DatePicker, Form, Input, Modal, Table } from "antd"
import { useForm } from "antd/es/form/Form"
import FormItem from "antd/es/form/FormItem"
import { getEnumKey, isNonNullable, showTotal } from "deepsea-tools"
import { type Columns, useScroll } from "soda-antd"
import type { StateToQueryFnMap } from "soda-hooks"
import { useQueryState } from "soda-next"

import { JsonViewer } from "@/components/JsonViewer"
import { UserButton } from "@/components/UserButton"

import { useQueryErrorLog } from "@/hooks/useQueryErrorLog"

import { getParser } from "@/schemas"
import { type ErrorLogSortByParams, errorLogSortBySchema } from "@/schemas/errorLogSortBy"
import { pageNumParser } from "@/schemas/pageNum"
import { pageSizeParser } from "@/schemas/pageSize"
import { type SortOrderParams, sortOrderSchema } from "@/schemas/sortOrder"
import { UserRole } from "@/schemas/userRole"

import type { ErrorLog } from "@/shared/queryErrorLog"

import { formatDateTime } from "@/utils/formatDateTime"
import { getSortOrder } from "@/utils/getSortOrder"
import { parseQueryDate, stringifyQueryEndDate, stringifyQueryStartDate } from "@/utils/queryDate"

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
    sortBy: getParser(errorLogSortBySchema.optional().catch(undefined)),
    sortOrder: getParser(sortOrderSchema.optional().catch(undefined)),
}

const queryStringifiers: StateToQueryFnMap<typeof queryParsers> = {
    createdBefore: stringifyQueryEndDate,
    createdAfter: stringifyQueryStartDate,
}

const Page: FC = () => {
    const [query, setQuery] = useQueryState({
        keys: ["type", "message", "action", "ip", "userAgent", "name", "nickname"],
        parse: queryParsers,
        stringify: queryStringifiers,
    })

    type FormParams = typeof query

    const [form] = useForm<FormParams>()

    const [info, setInfo] = useState<Pick<ModalProps, "title" | "children">>()
    const container = useRef<HTMLDivElement>(null)
    const { y } = useScroll(container, { paginationMargin: 32 })

    const { createdAfter, createdBefore, pageNum, pageSize, ...rest } = query

    const { data, isLoading } = useQueryErrorLog({
        createdAfter: createdAfter?.toDate(),
        createdBefore: createdBefore?.toDate(),
        pageNum,
        pageSize,
        ...rest,
    })

    useEffect(() => {
        form.resetFields()

        form.setFieldsValue({
            type: query.type,
            message: query.message,
            action: query.action,
            name: query.name,
            ip: query.ip,
            userAgent: query.userAgent,
            createdAfter: query.createdAfter,
            createdBefore: query.createdBefore,
        })
    }, [form, query])

    const columns: Columns<ErrorLog> = [
        {
            title: "序号",
            key: "index",
            align: "center",
            fixed: "left",
            render(value, record, index) {
                return (pageNum - 1) * pageSize + index + 1
            },
        },
        {
            title: "用户名",
            dataIndex: "name",
            align: "center",
            fixed: "left",
            sorter: true,
            sortOrder: getSortOrder(query, "name"),
            render(value, record) {
                return !!record.userId && !!value && <UserButton data={{ id: record.userId, name: value }} />
            },
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
        },
        {
            title: "角色",
            dataIndex: "role",
            align: "center",
            render(value) {
                return value && getEnumKey(UserRole, value)
            },
        },
        {
            title: "类型",
            dataIndex: "type",
            align: "center",
            sorter: true,
            sortOrder: getSortOrder(query, "type"),
        },
        {
            title: "消息",
            dataIndex: "message",
            align: "center",
            ellipsis: true,
            render(value) {
                return (
                    !!value && (
                        <Button type="link" size="small" className="!px-0" onClick={() => setInfo({ title: "错误消息", children: value })}>
                            <span className="line-clamp-1 max-w-48 break-all">{value}</span>
                        </Button>
                    )
                )
            },
        },
        {
            title: "堆栈",
            dataIndex: "stack",
            align: "center",
            ellipsis: true,
            render(value) {
                return (
                    !!value && (
                        <Button type="link" size="small" className="!px-0" onClick={() => setInfo({ title: "错误堆栈", children: value })}>
                            <span className="line-clamp-1 max-w-48 break-all">{value}</span>
                        </Button>
                    )
                )
            },
        },
        {
            title: "参数",
            dataIndex: "params",
            align: "center",
            ellipsis: true,
            render(value) {
                return (
                    !!value && (
                        <Button
                            type="link"
                            size="small"
                            onClick={() =>
                                setInfo({
                                    title: "错误参数",
                                    children: <JsonViewer value={parseJson(value)} />,
                                })
                            }
                        >
                            <span className="line-clamp-1 max-w-48 break-all">{value}</span>
                        </Button>
                    )
                )
            },
        },
        {
            title: "IP",
            dataIndex: "ip",
            align: "center",
            sorter: true,
            sortOrder: getSortOrder(query, "ip"),
        },
        {
            title: "UserAgent",
            dataIndex: "userAgent",
            align: "center",
            sorter: true,
            sortOrder: getSortOrder(query, "userAgent"),
            render(value) {
                return (
                    isNonNullable(value) && (
                        <button
                            type="button"
                            className="line-clamp-1 max-w-48 break-all text-blue-500"
                            title={value}
                            onClick={() => setInfo({ title: "UserAgent", children: value })}
                        >
                            {value}
                        </button>
                    )
                )
            },
        },
        {
            title: "时间",
            dataIndex: "createdAt",
            align: "center",
            sorter: true,
            sortOrder: getSortOrder(query, "createdAt"),
            render(value) {
                return formatDateTime(value)
            },
        },
        {
            title: "操作",
            dataIndex: "action",
            align: "center",
            fixed: "right",
            sorter: true,
            sortOrder: getSortOrder(query, "action"),
        },
    ]

    const onChange: TableProps<ErrorLog>["onChange"] = function onChange(pagination, filters, sorter) {
        if (Array.isArray(sorter)) return

        setQuery(prev => ({
            ...prev,
            sortBy: sorter.field as ErrorLogSortByParams,
            sortOrder: (sorter.order ? sorter.order.slice(0, -3) : undefined) as SortOrderParams,
        }))
    }

    const isRequesting = isLoading

    function onReset() {
        form.resetFields()
        setQuery({} as FormParams)
    }

    return (
        <div className="flex h-full flex-col gap-4 pt-4">
            <div className="flex-none px-4">
                <Form<FormParams> name="query-error-log-form" form={form} className="gap-y-4" layout="inline" onFinish={setQuery}>
                    <FormItem<FormParams> name="type" label="类型">
                        <Input allowClear />
                    </FormItem>
                    <FormItem<FormParams> name="message" label="消息">
                        <Input allowClear />
                    </FormItem>
                    <FormItem<FormParams> name="action" label="函数名">
                        <Input allowClear />
                    </FormItem>
                    <FormItem<FormParams> name="name" label="用户名">
                        <Input allowClear />
                    </FormItem>
                    <FormItem<FormParams> name="nickname" label="昵称">
                        <Input allowClear />
                    </FormItem>
                    <FormItem<FormParams> name="ip" label="IP">
                        <Input allowClear />
                    </FormItem>
                    <FormItem<FormParams> name="userAgent" label="UserAgent">
                        <Input allowClear />
                    </FormItem>
                    <FormItem<FormParams> name="createdAfter" label="创建开始日期">
                        <DatePicker />
                    </FormItem>
                    <FormItem<FormParams> name="createdBefore" label="创建结束日期">
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
                </Form>
            </div>
            <div ref={container} className="px-4 fill-y">
                <Modal open={isNonNullable(info)} onCancel={() => setInfo(undefined)} footer={null} {...info} />
                <Table<ErrorLog>
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
                        onChange(page, size) {
                            setQuery(prev => ({ ...prev, pageNum: page, pageSize: size }))
                        },
                    }}
                />
            </div>
        </div>
    )
}

export default Page
