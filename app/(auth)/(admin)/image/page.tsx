"use client"

import { FC, useMemo, useRef } from "react"

import { Button, Form, Input, Popconfirm, Table, Tag } from "antd"
import FormItem from "antd/es/form/FormItem"
import { formatTime, showTotal } from "deepsea-tools"
import { Columns, useScroll } from "soda-antd"
import { useQueryState } from "soda-next"

import { useDeleteDockerImage } from "@/hooks/useDeleteDockerImage"
import { useQueryDockerImageDetail } from "@/hooks/useQueryDockerImageDetail"

import { pageNumParser } from "@/schemas/pageNum"
import { pageSizeParser } from "@/schemas/pageSize"

import { DockerImageItem } from "@/shared/queryDockerImageDetail"

export interface DockerImageFilterParams {
    name?: string
    project?: string
}

const Page: FC = () => {
    const { data, isLoading, refetch } = useQueryDockerImageDetail()
    const { mutateAsync: deleteDockerImage, isPending: isDeletePending } = useDeleteDockerImage()

    const [query, setQuery] = useQueryState({
        keys: ["name", "project"],
        parse: {
            pageNum: pageNumParser,
            pageSize: pageSizeParser,
        },
    })

    type FormParams = typeof query

    const container = useRef<HTMLDivElement>(null)
    const { y } = useScroll(container, { paginationMargin: 32 })

    const isRequesting = isLoading || isDeletePending

    function onRefresh() {
        refetch()
    }

    async function onDelete(name: string) {
        await deleteDockerImage({ name })
    }

    const filteredData = useMemo(() => {
        const list = data ?? []
        const nameKeyword = query.name?.trim()
        const projectKeyword = query.project?.trim()

        return list.filter(item => {
            const isNameMatch = nameKeyword ? item.name.includes(nameKeyword) : true
            const isProjectMatch = projectKeyword ? item.projects.some(project => project.includes(projectKeyword)) : true
            return isNameMatch && isProjectMatch
        })
    }, [data, query.name, query.project])

    const pagedData = useMemo(() => {
        const pageNum = query.pageNum ?? 1
        const pageSize = query.pageSize ?? 10
        const start = (pageNum - 1) * pageSize
        const end = start + pageSize
        return filteredData.slice(start, end)
    }, [filteredData, query.pageNum, query.pageSize])

    const columns: Columns<DockerImageItem> = [
        {
            title: "镜像名称",
            dataIndex: "name",
            align: "left",
        },
        {
            title: "镜像 ID",
            dataIndex: "id",
            align: "center",
            render(value: string) {
                return value ? value.slice(0, 12) : "-"
            },
        },
        {
            title: "大小",
            dataIndex: "size",
            align: "center",
        },
        {
            title: "创建时间",
            dataIndex: "createdAt",
            align: "center",
            render(value: string) {
                return formatTime(value)
            },
        },
        {
            title: "关联项目",
            dataIndex: "projects",
            align: "center",
            render(value: string[]) {
                if (!value || value.length === 0) return "-"
                return (
                    <div className="flex flex-wrap justify-center gap-1">
                        {value.map(item => (
                            <Tag key={item} color="blue">
                                {item}
                            </Tag>
                        ))}
                    </div>
                )
            },
        },
        {
            title: "操作",
            key: "operation",
            align: "center",
            render(value, record) {
                return (
                    <Popconfirm title="确认删除镜像" description="删除后可能影响相关容器" onConfirm={() => onDelete(record.name)}>
                        <Button danger type="link" disabled={isRequesting}>
                            删除
                        </Button>
                    </Popconfirm>
                )
            },
        },
    ]

    return (
        <div className="flex h-full flex-col gap-4 pt-4">
            <title>镜像管理</title>
            <div className="flex-none px-4">
                <Form<FormParams> className="gap-y-4" layout="inline" onFinish={setQuery}>
                    <FormItem<FormParams> name="name" label="镜像名称">
                        <Input allowClear />
                    </FormItem>
                    <FormItem<FormParams> name="project" label="关联项目">
                        <Input allowClear />
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
                    <Button className="ml-auto" color="primary" disabled={isRequesting} onClick={onRefresh}>
                        刷新
                    </Button>
                </Form>
            </div>
            <div ref={container} className="px-4 fill-y">
                <Table<DockerImageItem>
                    columns={columns}
                    dataSource={pagedData}
                    loading={isLoading}
                    pagination={{
                        current: query.pageNum,
                        pageSize: query.pageSize,
                        total: filteredData.length,
                        showTotal,
                        onChange(page, size) {
                            setQuery(prev => ({ ...prev, pageNum: page, pageSize: size }))
                        },
                    }}
                    rowKey="id"
                    scroll={{ y }}
                />
            </div>
        </div>
    )
}

export default Page
