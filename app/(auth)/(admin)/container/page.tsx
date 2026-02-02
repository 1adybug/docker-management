"use client"

import { FC, useMemo, useRef } from "react"

import { IconPlayerPause, IconPlayerStopFilled, IconRefresh, IconTrash } from "@tabler/icons-react"
import { Button, Form, Input, Popconfirm, Select, Table, Tag } from "antd"
import FormItem from "antd/es/form/FormItem"
import { formatTime, showTotal } from "deepsea-tools"
import { Columns, useScroll } from "soda-antd"
import { useQueryState } from "soda-next"

import DockerContainerStatusSelect from "@/components/DockerContainerStatusSelect"

import { DockerContainerStatus } from "@/constants"

import { useQueryDockerContainer } from "@/hooks/useQueryDockerContainer"
import { useRunDockerContainer } from "@/hooks/useRunDockerContainer"

import { DockerContainerCommand } from "@/schemas/dockerContainerCommand"
import { pageNumParser } from "@/schemas/pageNum"
import { pageSizeParser } from "@/schemas/pageSize"

import { DockerContainerItem } from "@/shared/queryDockerContainer"

/** 容器筛选参数 */
/** 容器筛选参数 */
export interface ContainerFilterParams {
    name?: string
    image?: string
    status?: DockerContainerStatus
    project?: string
}

/** 非平台项目筛选值 */
const unmanagedProjectValue = "__unmanaged"
/** 无项目名筛选值 */
const noProjectValue = "__none"

const Page: FC = () => {
    const { data, isLoading, refetch } = useQueryDockerContainer()
    const { mutateAsync: runDockerContainer, isPending: isRunPending } = useRunDockerContainer()

    const isRequesting = isLoading || isRunPending

    const [query, setQuery] = useQueryState({
        keys: ["name", "image", "status", "project"],
        parse: {
            pageNum: pageNumParser,
            pageSize: pageSizeParser,
        },
    })

    type FormParams = typeof query

    const container = useRef<HTMLDivElement>(null)
    const { y } = useScroll(container, { paginationMargin: 32 })

    function onRefresh() {
        refetch()
    }

    async function onCommand(id: string, command: DockerContainerCommand) {
        await runDockerContainer({ id, command })
    }

    function onReset() {
        setQuery({} as FormParams)
    }

    /** 解析容器状态 */
    function getStatusValue(status?: string) {
        const value = status?.toLowerCase() ?? ""
        if (value.includes("up")) return DockerContainerStatus.运行中
        if (value.includes("exited")) return DockerContainerStatus.已退出
        if (value.includes("restarting")) return DockerContainerStatus.重启中
        if (value.includes("paused")) return DockerContainerStatus.已暂停
        if (value.includes("created")) return DockerContainerStatus.已创建
        if (value.includes("dead")) return DockerContainerStatus.已失效
        return DockerContainerStatus.其他
    }

    const projectOptions = useMemo(() => {
        const options = (data ?? [])
            .map(item => item.projectName)
            .filter(Boolean)
            .map(item => item?.trim())
            .filter(Boolean) as string[]
        const unique = Array.from(new Set(options))
        const items = unique.map(item => ({ label: item, value: item }))
        items.unshift({ label: "空", value: noProjectValue })
        items.push({ label: "非平台项目", value: unmanagedProjectValue })
        return items
    }, [data])

    const filteredData = useMemo(() => {
        const list = data ?? []

        const keywordMap = {
            name: query.name?.trim(),
            image: query.image?.trim(),
            status: query.status?.trim(),
        }

        return list.filter(item => {
            const isNameMatch = keywordMap.name ? item.name.includes(keywordMap.name) : true
            const isImageMatch = keywordMap.image ? item.image.includes(keywordMap.image) : true
            const isStatusMatch = keywordMap.status ? getStatusValue(item.status) === keywordMap.status : true
            const isProjectMatch =
                query.project === unmanagedProjectValue
                    ? !item.isManagedProject
                    : query.project === noProjectValue
                      ? !item.projectName
                      : query.project
                        ? item.projectName === query.project
                        : true

            return isNameMatch && isImageMatch && isStatusMatch && isProjectMatch
        })
    }, [data, query.image, query.name, query.project, query.status])

    const pagedData = useMemo(() => {
        const pageNum = query.pageNum ?? 1
        const pageSize = query.pageSize ?? 10
        const start = (pageNum - 1) * pageSize
        const end = start + pageSize
        return filteredData.slice(start, end)
    }, [filteredData, query.pageNum, query.pageSize])

    const columns: Columns<DockerContainerItem> = [
        {
            title: "容器名称",
            dataIndex: "name",
            align: "left",
        },
        {
            title: "镜像",
            dataIndex: "image",
            align: "center",
        },
        {
            title: "状态",
            dataIndex: "status",
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
            title: "端口",
            dataIndex: "ports",
            align: "center",
            render(value: string) {
                return value || "-"
            },
        },
        {
            title: "项目",
            dataIndex: "projectName",
            align: "center",
            render(value: string | undefined, record) {
                if (!value) return "-"
                return (
                    <div className="flex flex-wrap justify-center gap-1">
                        <Tag color={record.isManagedProject ? "geekblue" : "orange"} variant={record.isManagedProject ? "solid" : "filled"}>
                            {value}
                        </Tag>
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
                    <div className="inline-flex flex-wrap gap-1">
                        <Button
                            size="small"
                            shape="circle"
                            color="yellow"
                            variant="text"
                            disabled={isRequesting}
                            icon={<IconPlayerStopFilled className="size-4" />}
                            onClick={() => onCommand(record.id, DockerContainerCommand.停止)}
                        />
                        <Button
                            size="small"
                            shape="circle"
                            color="default"
                            variant="text"
                            disabled={isRequesting}
                            icon={<IconPlayerPause className="size-4" />}
                            onClick={() => onCommand(record.id, DockerContainerCommand.暂停)}
                        />
                        <Button
                            size="small"
                            shape="circle"
                            color="default"
                            variant="text"
                            disabled={isRequesting}
                            icon={<IconRefresh className="size-4" />}
                            onClick={() => onCommand(record.id, DockerContainerCommand.重启)}
                        />
                        <Popconfirm title="确认删除容器" description="删除后将无法恢复" onConfirm={() => onCommand(record.id, DockerContainerCommand.删除)}>
                            <Button size="small" shape="circle" color="danger" variant="text" disabled={isRequesting} icon={<IconTrash className="size-4" />} />
                        </Popconfirm>
                    </div>
                )
            },
        },
    ]

    return (
        <div className="flex h-full flex-col gap-4 pt-4">
            <title>容器管理</title>
            <div className="flex-none px-4">
                <Form<FormParams> className="gap-y-4" layout="inline" onFinish={setQuery}>
                    <FormItem<FormParams> name="name" label="容器名称">
                        <Input />
                    </FormItem>
                    <FormItem<FormParams> name="image" label="镜像">
                        <Input />
                    </FormItem>
                    <FormItem<FormParams> name="status" label="状态">
                        <DockerContainerStatusSelect allowClear placeholder="选择状态" />
                    </FormItem>
                    <FormItem<FormParams> name="project" label="项目">
                        <Select className="!w-48" allowClear options={projectOptions} placeholder="选择项目" />
                    </FormItem>
                    <FormItem<FormParams>>
                        <Button disabled={isRequesting} htmlType="submit" type="primary">
                            查询
                        </Button>
                    </FormItem>
                    <FormItem<FormParams>>
                        <Button disabled={isRequesting} htmlType="button" type="text" onClick={onReset}>
                            重置
                        </Button>
                    </FormItem>
                    <Button className="ml-auto" color="primary" disabled={isRequesting} onClick={onRefresh}>
                        刷新
                    </Button>
                </Form>
            </div>
            <div ref={container} className="px-4 fill-y">
                <Table<DockerContainerItem>
                    columns={columns}
                    dataSource={pagedData}
                    loading={isLoading}
                    pagination={{
                        current: query.pageNum,
                        pageSize: query.pageSize,
                        showTotal,
                        total: filteredData.length,
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
