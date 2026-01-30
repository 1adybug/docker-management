"use client"

import { FC, useRef, useState } from "react"

import JsonView from "@uiw/react-json-view"
import { Button, DatePicker, Form, Input, Modal, ModalProps, Table, TableProps } from "antd"
import FormItem from "antd/es/form/FormItem"
import { formatTime, getEnumKey, isNonNullable, naturalParser, showTotal } from "deepsea-tools"
import { Columns, getTimeRange, useScroll } from "soda-antd"
import { transformState } from "soda-hooks"
import { useQueryState } from "soda-next"

import User from "@/components/User"

import { useQueryOperationLog } from "@/hooks/useQueryOperationLog"

import { getParser } from "@/schemas"
import { OperationLogSortByParams, operationLogSortBySchema } from "@/schemas/operationLogSortBy"
import { pageNumParser } from "@/schemas/pageNum"
import { pageSizeParser } from "@/schemas/pageSize"
import { Role } from "@/schemas/role"
import { SortOrderParams, sortOrderSchema } from "@/schemas/sortOrder"

import { OperationLog } from "@/shared/queryOperationLog"

import { getSortOrder } from "@/utils/getSortOrder"

const Page: FC = () => {
    const [query, setQuery] = transformState(
        useQueryState({
            keys: ["action", "ip", "userAgent", "username"],
            parse: {
                createdBefore: naturalParser,
                createdAfter: naturalParser,
                pageNum: pageNumParser,
                pageSize: pageSizeParser,
                sortBy: getParser(operationLogSortBySchema.optional().catch(undefined)),
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

    const [info, setInfo] = useState<Pick<ModalProps, "title" | "children">>()
    const container = useRef<HTMLDivElement>(null)
    const { y } = useScroll(container, { paginationMargin: 32 })

    const { createdAt, pageNum, pageSize, ...rest } = query

    const { data, isLoading } = useQueryOperationLog({
        createdAfter: createdAt?.[0].toDate(),
        createdBefore: createdAt?.[1].toDate(),
        pageNum,
        pageSize,
        ...rest,
    })

    const columns: Columns<OperationLog> = [
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
            dataIndex: "username",
            align: "center",
            sorter: true,
            sortOrder: getSortOrder(query, "username"),
            render(value, record) {
                return record.userId && value ? <User data={{ id: record.userId, username: value }} /> : "—"
            },
        },
        {
            title: "手机号",
            dataIndex: "phone",
            align: "center",
            render(value) {
                return value || "—"
            },
        },
        {
            title: "角色",
            dataIndex: "role",
            align: "center",
            render(value) {
                return (value && getEnumKey(Role, value)) || "—"
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
                if (!value) return "—"

                return (
                    <Button
                        type="link"
                        size="small"
                        className="!px-0"
                        onClick={() =>
                            setInfo({
                                title: "操作参数",
                                children: <JsonView className="!font-['Source_Han_Sans_VF']" value={JSON.parse(value)} />,
                            })
                        }
                    >
                        <span className="line-clamp-1 max-w-48 break-all">{value}</span>
                    </Button>
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
                return isNonNullable(value) ? (
                    <button
                        type="button"
                        className="line-clamp-1 max-w-48 break-all text-blue-500"
                        title={value}
                        onClick={() => setInfo({ title: "UserAgent", children: value })}
                    >
                        {value}
                    </button>
                ) : (
                    "—"
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

    const onChange: TableProps<OperationLog>["onChange"] = function onChange(pagination, filters, sorter) {
        if (Array.isArray(sorter)) return

        setQuery(prev => ({
            ...prev,
            sortBy: sorter.field as OperationLogSortByParams,
            sortOrder: (sorter.order ? sorter.order.slice(0, -3) : undefined) as SortOrderParams,
        }))
    }

    const isRequesting = isLoading

    return (
        <div className="flex h-full flex-col gap-4 pt-4">
            <title>操作日志</title>
            <div className="flex-none px-4">
                <Form<FormParams> className="gap-y-4" layout="inline" onFinish={setQuery}>
                    <FormItem<FormParams> name="action" label="函数名">
                        <Input allowClear />
                    </FormItem>
                    <FormItem<FormParams> name="username" label="用户名">
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
                        <Button htmlType="button" type="text" disabled={isRequesting} onClick={() => setQuery({} as FormParams)}>
                            重置
                        </Button>
                    </FormItem>
                </Form>
            </div>
            <div ref={container} className="px-4 fill-y">
                <Modal open={isNonNullable(info)} onCancel={() => setInfo(undefined)} width={800} footer={null} {...info} />
                <Table<OperationLog>
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
