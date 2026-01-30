"use client"

import { FC, useRef, useState } from "react"

import { IconEdit, IconTrash } from "@tabler/icons-react"
import { Button, DatePicker, Form, Input, Popconfirm, Table, TableProps } from "antd"
import FormItem from "antd/es/form/FormItem"
import { formatTime, getEnumKey, naturalParser, showTotal } from "deepsea-tools"
import { Columns, getTimeRange, useScroll } from "soda-antd"
import { transformState } from "soda-hooks"
import { useQueryState } from "soda-next"

import UserEditor from "@/components/UserEditor"

import { useDeleteUser } from "@/hooks/useDeleteUser"
import { useQueryUser } from "@/hooks/useQueryUser"

import { getParser } from "@/schemas"
import { pageNumParser } from "@/schemas/pageNum"
import { pageSizeParser } from "@/schemas/pageSize"
import { Role } from "@/schemas/role"
import { SortOrderParams, sortOrderSchema } from "@/schemas/sortOrder"
import { UserSortByParams, userSortBySchema } from "@/schemas/userSortBy"

import { User } from "@/shared/queryUser"

import { getSortOrder } from "@/utils/getSortOrder"

const Page: FC = () => {
    const [query, setQuery] = transformState(
        useQueryState({
            keys: ["id", "username", "phone"],
            parse: {
                createdBefore: naturalParser,
                createdAfter: naturalParser,
                updatedBefore: naturalParser,
                updatedAfter: naturalParser,
                pageNum: pageNumParser,
                pageSize: pageSizeParser,
                sortBy: getParser(userSortBySchema.optional().catch(undefined)),
                sortOrder: getParser(sortOrderSchema.optional().catch(undefined)),
            },
        }),
        {
            get({ createdAfter, createdBefore, updatedAfter, updatedBefore, ...rest }) {
                return {
                    createdAt: getTimeRange(createdAfter, createdBefore),
                    updatedAt: getTimeRange(updatedAfter, updatedBefore),
                    ...rest,
                }
            },
            set({ createdAt, updatedAt, ...rest }) {
                return {
                    createdAfter: createdAt?.[0].valueOf(),
                    createdBefore: createdAt?.[1].valueOf(),
                    updatedAfter: updatedAt?.[0].valueOf(),
                    updatedBefore: updatedAt?.[1].valueOf(),
                    ...rest,
                }
            },
            dependOnGet: false,
        },
    )

    type FormParams = typeof query

    const [editId, setEditId] = useState<string | undefined>(undefined)
    const [showEditor, setShowEditor] = useState(false)
    const container = useRef<HTMLDivElement>(null)
    const { y } = useScroll(container, { paginationMargin: 32 })

    const columns: Columns<User> = [
        {
            title: "序号",
            key: "index",
            align: "center",
            render: (value, record, index) => index + 1,
        },
        {
            title: "用户名",
            dataIndex: "username",
            align: "center",
            sorter: true,
            sortOrder: getSortOrder(query, "username"),
        },
        {
            title: "手机号",
            dataIndex: "phone",
            align: "center",
            sorter: true,
            sortOrder: getSortOrder(query, "phone"),
        },
        {
            title: "角色",
            dataIndex: "role",
            align: "center",
            sorter: true,
            sortOrder: getSortOrder(query, "role"),
            render(value) {
                return getEnumKey(Role, value)
            },
        },
        {
            title: "创建时间",
            dataIndex: "createdAt",
            align: "center",
            sorter: true,
            sortOrder: getSortOrder(query, "createdAt"),
            render(value) {
                return formatTime(value)
            },
        },
        {
            title: "更新时间",
            dataIndex: "updatedAt",
            align: "center",
            sorter: true,
            sortOrder: getSortOrder(query, "updatedAt"),
            render(value) {
                return formatTime(value)
            },
        },
        {
            title: "操作",
            key: "operation",
            dataIndex: "id",
            align: "center",
            render(value) {
                return (
                    <div className="inline-flex gap-1">
                        <Button
                            size="small"
                            shape="circle"
                            color="default"
                            variant="text"
                            disabled={isRequesting}
                            icon={<IconEdit className="size-4" />}
                            onClick={() => onUpdate(value)}
                        />
                        <Popconfirm title="确认删除用户" description="请在删除用户前，确保已备份相关数据" onConfirm={() => deleteUserAsync(value)}>
                            <Button
                                size="small"
                                shape="circle"
                                color="danger"
                                variant="text"
                                disabled={isRequesting}
                                icon={<IconTrash className="size-4" />}
                            />
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

    function onClose() {
        setEditId(undefined)
        setShowEditor(false)
    }

    const { createdAt, updatedAt, pageNum, pageSize, ...rest } = query

    const { data, isLoading } = useQueryUser({
        createdAfter: createdAt?.[0].toDate(),
        createdBefore: createdAt?.[1].toDate(),
        updatedAfter: updatedAt?.[0].toDate(),
        updatedBefore: updatedAt?.[1].toDate(),
        pageNum,
        pageSize,
        ...rest,
    })

    const { mutateAsync: deleteUserAsync, isPending: isDeleteUserPending } = useDeleteUser()

    const isRequesting = isLoading || isDeleteUserPending

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
            <title>用户管理</title>
            <div className="flex-none px-4">
                <Form<FormParams> className="gap-y-4" layout="inline" onFinish={setQuery}>
                    <FormItem<FormParams> name="username" label="用户名">
                        <Input />
                    </FormItem>
                    <FormItem<FormParams> name="phone" label="手机号">
                        <Input />
                    </FormItem>
                    <FormItem<FormParams> name="createdAt" label="创建时间">
                        <DatePicker.RangePicker />
                    </FormItem>
                    <FormItem<FormParams> name="updatedAt" label="更新时间">
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
                    <Button className="ml-auto" color="primary" disabled={isRequesting} onClick={onAdd}>
                        新增
                    </Button>
                </Form>
            </div>
            <div ref={container} className="px-4 fill-y">
                <UserEditor id={editId} open={showEditor} onClose={onClose} />
                <Table<User>
                    columns={columns}
                    dataSource={data?.list}
                    loading={isLoading}
                    rowKey="id"
                    onChange={onChange}
                    scroll={{ y }}
                    pagination={{
                        current: pageNum,
                        pageSize,
                        showTotal,
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
