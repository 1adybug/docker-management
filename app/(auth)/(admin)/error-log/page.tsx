"use client"

import { FC, useEffect, useRef, useState } from "react"

import JsonView from "@uiw/react-json-view"
import { Button, DatePicker, Form, Input, Modal, ModalProps, Table, TableProps } from "antd"
import { useForm } from "antd/es/form/Form"
import FormItem from "antd/es/form/FormItem"
import { formatTime, getEnumKey, isNonNullable, naturalParser, showTotal } from "deepsea-tools"
import { Columns, getTimeRange, useScroll } from "soda-antd"
import { transformState } from "soda-hooks"
import { useQueryState } from "soda-next"

import Userw from "@/components/UserButton"

import { useQueryErrorLog } from "@/hooks/useQueryErrorLog"

import { getParser } from "@/schemas"
import { ErrorLogSortByParams, errorLogSortBySchema } from "@/schemas/errorLogSortBy"
import { pageNumParser } from "@/schemas/pageNum"
import { pageSizeParser } from "@/schemas/pageSize"
import { SortOrderParams, sortOrderSchema } from "@/schemas/sortOrder"
import { UserRole } from "@/schemas/userRole"

import { ErrorLog } from "@/shared/queryErrorLog"

import { getSortOrder } from "@/utils/getSortOrder"

function parseJson(value: string) {
    try {
        return JSON.parse(value)
    } catch {
        return value
    }
}

const Page: FC = () => {
    const [query, setQuery] = transformState(
        useQueryState({
            keys: ["type", "message", "action", "ip", "userAgent", "name"],
            parse: {
                createdBefore: naturalParser,
                createdAfter: naturalParser,
                pageNum: pageNumParser,
                pageSize: pageSizeParser,
                sortBy: getParser(errorLogSortBySchema.optional().catch(undefined)),
                sortOrder: getParser(sortOrderSchema.optional().catch(undefined)),
            },
        }),
        {
            get({ createdAfter, createdBefore, ...rest }) {
                return {
                    createdAt: getTimeRange(createdAfter, createdBefore),
                    ...rest,
                }
            },
            set({ createdAt, ...rest }) {
                return {
                    createdAfter: createdAt?.[0].valueOf(),
                    createdBefore: createdAt?.[1].valueOf(),
                    ...rest,
                }
            },
            dependOnGet: false,
        },
    )

    type FormParams = typeof query

    const [form] = useForm<FormParams>()

    const [info, setInfo] = useState<Pick<ModalProps, "title" | "children">>()
    const container = useRef<HTMLDivElement>(null)
    const { y } = useScroll(container, { paginationMargin: 32 })

    const { createdAt, pageNum, pageSize, ...rest } = query

    const { data, isLoading } = useQueryErrorLog({
        createdAfter: createdAt?.[0].toDate(),
        createdBefore: createdAt?.[1].toDate(),
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
            createdAt: query.createdAt,
        })
    }, [form, query])

    const columns: Columns<ErrorLog> = [
        {
            title: "序号",
            key: "index",
            align: "center",
            render(value, record, index) {
                return (pageNum - 1) * pageSize + index + 1
            },
        },
        {
            title: "用户",
            dataIndex: "name",
            align: "center",
            sorter: true,
            sortOrder: getSortOrder(query, "name"),
            render(value, record) {
                return !!record.userId && !!value && <Userw data={{ id: record.userId, name: value }} />
            },
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
            title: "操作",
            dataIndex: "action",
            align: "center",
            sorter: true,
            sortOrder: getSortOrder(query, "action"),
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
                                    children: <JsonView className="!font-['Source_Han_Sans_SC_VF']" value={parseJson(value)} />,
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
                return formatTime(value)
            },
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
            <title>异常日志</title>
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
                    <FormItem<FormParams> name="ip" label="IP">
                        <Input allowClear />
                    </FormItem>
                    <FormItem<FormParams> name="userAgent" label="UserAgent">
                        <Input allowClear />
                    </FormItem>
                    <FormItem<FormParams> name="createdAt" label="创建时间">
                        <DatePicker.RangePicker />
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
                    scroll={{ y }}
                    pagination={{
                        current: pageNum,
                        pageSize,
                        total: data?.total,
                        showTotal,
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
