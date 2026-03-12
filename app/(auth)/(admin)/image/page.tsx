"use client"

import { FC, useMemo, useRef } from "react"

import { IconTrash } from "@tabler/icons-react"
import { Button, Form, Input, Popconfirm, Table, Tag } from "antd"
import FormItem from "antd/es/form/FormItem"
import { InputFileButton } from "deepsea-components"
import { formatTime, showTotal } from "deepsea-tools"
import { Columns, useScroll } from "soda-antd"
import { useQueryState } from "soda-next"

import { useDeleteDockerImage } from "@/hooks/useDeleteDockerImage"
import { useQueryDockerImageDetail } from "@/hooks/useQueryDockerImageDetail"
import { useUploadDockerImage } from "@/hooks/useUploadDockerImage"

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
    const { mutateAsync: uploadDockerImage, isPending: isUploadPending } = useUploadDockerImage()

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

    const isRequesting = isLoading || isDeletePending || isUploadPending

    function onRefresh() {
        refetch()
    }

    async function onFileChange(file: File) {
        if (!file.name.toLowerCase().endsWith(".tar")) return message.error("仅支持上传 tar 文件")

        const formData = new FormData()
        formData.set("file", file)

        await uploadDockerImage(formData)
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
                        <Button
                            size="small"
                            shape="circle"
                            color="danger"
                            variant="text"
                            title="删除"
                            disabled={isRequesting}
                            icon={<IconTrash className="size-4" />}
                        />
                    </Popconfirm>
                )
            },
        },
    ]

    return (
        <div className="flex h-full flex-col gap-4 pt-4">
            <title>镜像管理</title>
            <div className="flex-none px-4">
                <Form<FormParams> name="query-image-form" className="gap-y-4" layout="inline" onFinish={setQuery}>
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
                    <div className="ml-auto flex items-center gap-2">
                        <InputFileButton as={Button} disabled={isRequesting} accept=".tar,application/x-tar" onValueChange={onFileChange} clearAfterChange>
                            上传镜像
                        </InputFileButton>
                        <Button color="primary" disabled={isRequesting} onClick={onRefresh}>
                            刷新
                        </Button>
                    </div>
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
