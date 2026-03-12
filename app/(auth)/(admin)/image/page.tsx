"use client"

import { FC, useEffect, useMemo, useRef, useState } from "react"

import { IconTrash } from "@tabler/icons-react"
import { Button, Form, Input, message, Modal, Popconfirm, Select, Table, Tag } from "antd"
import { useForm } from "antd/es/form/Form"
import FormItem from "antd/es/form/FormItem"
import { InputFileButton } from "deepsea-components"
import { formatTime, showTotal } from "deepsea-tools"
import { Columns, schemaToRule, useScroll } from "soda-antd"
import { useQueryState } from "soda-next"

import { useBuildJarDockerImage } from "@/hooks/useBuildJarDockerImage"
import { useBuildStaticDockerImage } from "@/hooks/useBuildStaticDockerImage"
import { useDeleteDockerImage } from "@/hooks/useDeleteDockerImage"
import { useQueryDockerImageDetail } from "@/hooks/useQueryDockerImageDetail"
import { useUploadDockerImage } from "@/hooks/useUploadDockerImage"

import { dockerImageNameSchema } from "@/schemas/dockerImageName"
import { dockerStartCommandSchema } from "@/schemas/dockerStartCommand"
import { pageNumParser } from "@/schemas/pageNum"
import { pageSizeParser } from "@/schemas/pageSize"

import { DockerImageItem } from "@/shared/queryDockerImageDetail"

export interface DockerImageFilterParams {
    name?: string
    project?: string
}

export interface StaticDockerImageFormParams {
    imageName?: string
    nginxImage?: string
}

export interface JarDockerImageFormParams {
    imageName?: string
    javaImage?: string
    startCommand?: string
}

const DEFAULT_JAR_START_COMMAND = "java -jar app.jar"

function getDefaultNginxImage(imageNames: string[]) {
    if (imageNames.includes("nginx:latest")) return "nginx:latest"
    if (imageNames.includes("nginx:alpine")) return "nginx:alpine"
    return imageNames[0]
}

function getDefaultJavaImage(imageNames: string[]) {
    const commonImageNames = [
        "eclipse-temurin:21-jre",
        "eclipse-temurin:17-jre",
        "eclipse-temurin:21",
        "eclipse-temurin:17",
        "openjdk:21-jdk",
        "openjdk:17-jdk",
        "openjdk:21",
        "openjdk:17",
        "amazoncorretto:21",
        "amazoncorretto:17",
    ]

    for (const item of commonImageNames) {
        if (imageNames.includes(item)) return item
    }

    return imageNames.find(item => /eclipse-temurin|openjdk|amazoncorretto|liberica|sapmachine|semeru|dragonwell/i.test(item))
}

const Page: FC = () => {
    const { data, isLoading, refetch } = useQueryDockerImageDetail()
    const { mutateAsync: deleteDockerImage, isPending: isDeletePending } = useDeleteDockerImage()
    const { mutateAsync: uploadDockerImage, isPending: isUploadPending } = useUploadDockerImage()
    const { mutateAsync: buildJarDockerImage, isPending: isBuildJarPending } = useBuildJarDockerImage()
    const { mutateAsync: buildStaticDockerImage, isPending: isBuildStaticPending } = useBuildStaticDockerImage()

    const [query, setQuery] = useQueryState({
        keys: ["name", "project"],
        parse: {
            pageNum: pageNumParser,
            pageSize: pageSizeParser,
        },
    })

    type FormParams = typeof query

    const [buildStaticForm] = useForm<StaticDockerImageFormParams>()
    const [buildJarForm] = useForm<JarDockerImageFormParams>()
    const container = useRef<HTMLDivElement>(null)
    const [staticFile, setStaticFile] = useState<File | undefined>(undefined)
    const [jarFile, setJarFile] = useState<File | undefined>(undefined)
    const [isBuildStaticModalOpen, setIsBuildStaticModalOpen] = useState(false)
    const [isBuildJarModalOpen, setIsBuildJarModalOpen] = useState(false)
    const { y } = useScroll(container, { paginationMargin: 32 })

    const imageNames = useMemo(() => Array.from(new Set((data ?? []).map(item => item.name))), [data])
    const nginxImageNames = useMemo(() => imageNames.filter(name => name.startsWith("nginx:")), [imageNames])
    const defaultNginxImage = useMemo(() => getDefaultNginxImage(nginxImageNames), [nginxImageNames])
    const defaultJavaImage = useMemo(() => getDefaultJavaImage(imageNames), [imageNames])
    const imageOptions = useMemo(() => imageNames.map(item => ({ label: item, value: item })), [imageNames])
    const nginxImageOptions = useMemo(() => nginxImageNames.map(item => ({ label: item, value: item })), [nginxImageNames])

    const isRequesting = isLoading || isDeletePending || isUploadPending || isBuildStaticPending || isBuildJarPending

    useEffect(() => {
        if (!isBuildStaticModalOpen) {
            buildStaticForm.resetFields()
            setStaticFile(undefined)
            return
        }

        buildStaticForm.setFieldValue("nginxImage", defaultNginxImage)
    }, [buildStaticForm, defaultNginxImage, isBuildStaticModalOpen])

    useEffect(() => {
        if (!isBuildJarModalOpen) {
            buildJarForm.resetFields()
            setJarFile(undefined)
            return
        }

        buildJarForm.setFieldsValue({
            javaImage: defaultJavaImage,
            startCommand: DEFAULT_JAR_START_COMMAND,
        })
    }, [buildJarForm, defaultJavaImage, isBuildJarModalOpen])

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

    function onOpenBuildStaticModal() {
        setIsBuildStaticModalOpen(true)
    }

    function onOpenBuildJarModal() {
        setIsBuildJarModalOpen(true)
    }

    function onCloseBuildStaticModal() {
        if (isBuildStaticPending) return
        setIsBuildStaticModalOpen(false)
    }

    function onCloseBuildJarModal() {
        if (isBuildJarPending) return
        setIsBuildJarModalOpen(false)
    }

    function onStaticFileChange(file: File) {
        const lowerFileName = file.name.toLowerCase()

        if (!lowerFileName.endsWith(".zip") && !lowerFileName.endsWith(".7z")) {
            message.error("仅支持上传 zip 或 7z 文件")
            return
        }

        setStaticFile(file)
    }

    function onJarFileChange(file: File) {
        if (!file.name.toLowerCase().endsWith(".jar")) {
            message.error("仅支持上传 Jar 文件")
            return
        }

        setJarFile(file)
    }

    async function onBuildStaticFinish(values: StaticDockerImageFormParams) {
        if (!staticFile) {
            message.error("请先选择静态文件")
            return
        }

        if (!values.nginxImage) {
            message.error("请先选择 nginx 镜像")
            return
        }

        if (!values.imageName) {
            message.error("请先填写镜像名")
            return
        }

        const formData = new FormData()
        formData.set("file", staticFile)
        formData.set("nginxImage", values.nginxImage)
        formData.set("imageName", values.imageName)

        await buildStaticDockerImage(formData)
        setIsBuildStaticModalOpen(false)
    }

    async function onBuildJarFinish(values: JarDockerImageFormParams) {
        if (!jarFile) {
            message.error("请先选择 Jar 文件")
            return
        }

        if (!values.javaImage) {
            message.error("请先选择 Java 镜像")
            return
        }

        if (!values.imageName) {
            message.error("请先填写镜像名")
            return
        }

        if (!values.startCommand) {
            message.error("请先填写启动命令")
            return
        }

        const formData = new FormData()
        formData.set("file", jarFile)
        formData.set("javaImage", values.javaImage)
        formData.set("imageName", values.imageName)
        formData.set("startCommand", values.startCommand)

        await buildJarDockerImage(formData)
        setIsBuildJarModalOpen(false)
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
                        <Button disabled={isRequesting} onClick={onOpenBuildStaticModal}>
                            上传静态文件制作镜像
                        </Button>
                        <Button disabled={isRequesting} onClick={onOpenBuildJarModal}>
                            上传 Jar 文件制作镜像
                        </Button>
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
            <Modal
                title="上传静态文件制作镜像"
                open={isBuildStaticModalOpen}
                onOk={() => buildStaticForm.submit()}
                okText="确认"
                cancelText="取消"
                okButtonProps={{ loading: isBuildStaticPending, disabled: nginxImageOptions.length === 0 }}
                cancelButtonProps={{ disabled: isBuildStaticPending }}
                onCancel={onCloseBuildStaticModal}
            >
                <Form<StaticDockerImageFormParams> form={buildStaticForm} layout="vertical" disabled={isBuildStaticPending} onFinish={onBuildStaticFinish}>
                    <FormItem label="静态文件" required extra="请上传 dist 文件夹压缩后的 zip 或 7z 文件">
                        <div className="flex items-center gap-2">
                            <InputFileButton
                                as={Button}
                                disabled={isBuildStaticPending}
                                accept=".zip,.7z,application/zip,application/x-7z-compressed"
                                onValueChange={onStaticFileChange}
                                clearAfterChange
                            >
                                选择文件
                            </InputFileButton>
                            <div className="min-w-0 flex-1 truncate text-sm text-neutral-500">{staticFile?.name ?? "未选择文件"}</div>
                        </div>
                    </FormItem>
                    <FormItem<StaticDockerImageFormParams>
                        name="nginxImage"
                        label="nginx 镜像"
                        rules={[schemaToRule(dockerImageNameSchema)]}
                        extra={nginxImageOptions.length === 0 ? "本机暂无 nginx 镜像，请先拉取 nginx 镜像" : undefined}
                    >
                        <Select allowClear showSearch options={nginxImageOptions} placeholder="请选择 nginx 镜像" notFoundContent="暂无 nginx 镜像" />
                    </FormItem>
                    <FormItem<StaticDockerImageFormParams> name="imageName" label="镜像名" rules={[schemaToRule(dockerImageNameSchema)]}>
                        <Input allowClear placeholder="例如: my-spa:latest" />
                    </FormItem>
                </Form>
            </Modal>
            <Modal
                title="上传 Jar 文件制作镜像"
                open={isBuildJarModalOpen}
                onOk={() => buildJarForm.submit()}
                okText="确认"
                cancelText="取消"
                okButtonProps={{ loading: isBuildJarPending, disabled: imageOptions.length === 0 }}
                cancelButtonProps={{ disabled: isBuildJarPending }}
                onCancel={onCloseBuildJarModal}
            >
                <Form<JarDockerImageFormParams> form={buildJarForm} layout="vertical" disabled={isBuildJarPending} onFinish={onBuildJarFinish}>
                    <FormItem label="Jar 文件" required extra="请上传可直接运行的 Jar 文件">
                        <div className="flex items-center gap-2">
                            <InputFileButton
                                as={Button}
                                disabled={isBuildJarPending}
                                accept=".jar,application/java-archive,application/x-java-archive"
                                onValueChange={onJarFileChange}
                                clearAfterChange
                            >
                                选择文件
                            </InputFileButton>
                            <div className="min-w-0 flex-1 truncate text-sm text-neutral-500">{jarFile?.name ?? "未选择文件"}</div>
                        </div>
                    </FormItem>
                    <FormItem<JarDockerImageFormParams>
                        name="javaImage"
                        label="Java 镜像"
                        rules={[schemaToRule(dockerImageNameSchema)]}
                        extra={
                            imageOptions.length === 0
                                ? "本机暂无基础镜像，请先拉取包含 Java 运行环境的镜像"
                                : !defaultJavaImage
                                  ? "未识别到常见 Java 镜像，请确认所选镜像已包含 Java 运行环境"
                                  : undefined
                        }
                    >
                        <Select allowClear showSearch options={imageOptions} placeholder="请选择 Java 镜像" notFoundContent="暂无基础镜像" />
                    </FormItem>
                    <FormItem<JarDockerImageFormParams> name="imageName" label="镜像名" rules={[schemaToRule(dockerImageNameSchema)]}>
                        <Input allowClear placeholder="例如: my-app:latest" />
                    </FormItem>
                    <FormItem<JarDockerImageFormParams> name="startCommand" label="启动命令" rules={[schemaToRule(dockerStartCommandSchema)]}>
                        <Input allowClear placeholder={DEFAULT_JAR_START_COMMAND} />
                    </FormItem>
                </Form>
            </Modal>
        </div>
    )
}

export default Page
