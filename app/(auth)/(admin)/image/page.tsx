"use client"

import { FC } from "react"

import { Button, Popconfirm, Table, Tag } from "antd"
import { formatTime } from "deepsea-tools"
import { Columns } from "soda-antd"

import { useDeleteDockerImage } from "@/hooks/useDeleteDockerImage"
import { useQueryDockerImageDetail } from "@/hooks/useQueryDockerImageDetail"

import { DockerImageItem } from "@/shared/queryDockerImageDetail"

const Page: FC = () => {
    const { data, isLoading, refetch } = useQueryDockerImageDetail()
    const { mutateAsync: deleteDockerImage, isPending: isDeletePending } = useDeleteDockerImage()

    const isRequesting = isLoading || isDeletePending

    function onRefresh() {
        refetch()
    }

    async function onDelete(name: string) {
        await deleteDockerImage({ name })
    }

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
            <div className="flex items-center px-4">
                <div>Docker 镜像</div>
                <Button className="ml-auto" color="primary" disabled={isRequesting} onClick={onRefresh}>
                    刷新
                </Button>
            </div>
            <div className="px-4">
                <Table<DockerImageItem> columns={columns} dataSource={data} loading={isLoading} rowKey="id" pagination={false} />
            </div>
        </div>
    )
}

export default Page
