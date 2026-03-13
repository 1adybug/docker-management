"use client"

import { FC, useEffect, useMemo, useRef, useState } from "react"

import { IconBrandDocker, IconBrandReact, IconCoffee, IconTrash } from "@tabler/icons-react"
import { Button, Checkbox, Form, Input, message, Modal, Popconfirm, Select, Table, Tag } from "antd"
import { useForm } from "antd/es/form/Form"
import FormItem from "antd/es/form/FormItem"
import { InputFileButton } from "deepsea-components"
import { formatTime, showTotal } from "deepsea-tools"
import { RotateCw } from "lucide-react"
import { Columns, schemaToRule, useScroll } from "soda-antd"
import { useQueryState } from "soda-next"

import { useBuildJarDockerImage } from "@/hooks/useBuildJarDockerImage"
import { useBuildStaticDockerImage } from "@/hooks/useBuildStaticDockerImage"
import { useDeleteDockerImage } from "@/hooks/useDeleteDockerImage"
import { useQueryDockerImageDetail } from "@/hooks/useQueryDockerImageDetail"
import { runProjectClient } from "@/hooks/useRunProject"
import { useUploadDockerImage } from "@/hooks/useUploadDockerImage"

import { dockerImageNameSchema } from "@/schemas/dockerImageName"
import { dockerStartCommandSchema } from "@/schemas/dockerStartCommand"
import { pageNumParser } from "@/schemas/pageNum"
import { pageSizeParser } from "@/schemas/pageSize"
import { ProjectCommand } from "@/schemas/projectCommand"

import { DockerImageItem } from "@/shared/queryDockerImageDetail"

export interface DockerImageFilterParams {
    name?: string
    project?: string
}

export interface QueryImageFormParams extends DockerImageFilterParams {
    pageNum?: number
    pageSize?: number
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

export interface UploadDockerImageParams {
    data?: DockerImageItem
    file: File
}

export interface RestartProjectsState {
    imageName?: string
    projectNames: string[]
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

    const [buildStaticForm] = useForm<StaticDockerImageFormParams>()
    const [buildJarForm] = useForm<JarDockerImageFormParams>()
    const container = useRef<HTMLDivElement>(null)
    const [staticFile, setStaticFile] = useState<File | undefined>(undefined)
    const [jarFile, setJarFile] = useState<File | undefined>(undefined)
    const [isBuildStaticModalOpen, setIsBuildStaticModalOpen] = useState(false)
    const [isBuildJarModalOpen, setIsBuildJarModalOpen] = useState(false)
    const [isRestartProjectsModalOpen, setIsRestartProjectsModalOpen] = useState(false)
    const [isRestartProjectsPending, setIsRestartProjectsPending] = useState(false)
    const [buildStaticTarget, setBuildStaticTarget] = useState<DockerImageItem | undefined>(undefined)
    const [buildJarTarget, setBuildJarTarget] = useState<DockerImageItem | undefined>(undefined)

    const [restartProjectsState, setRestartProjectsState] = useState<RestartProjectsState>({
        projectNames: [],
    })

    const [selectedRestartProjectNames, setSelectedRestartProjectNames] = useState<string[]>([])
    const { y } = useScroll(container, { paginationMargin: 32 })

    const imageNames = useMemo(() => Array.from(new Set((data ?? []).map(item => item.name))), [data])
    const nginxImageNames = useMemo(() => imageNames.filter(name => name.startsWith("nginx:")), [imageNames])
    const defaultNginxImage = useMemo(() => getDefaultNginxImage(nginxImageNames), [nginxImageNames])
    const defaultJavaImage = useMemo(() => getDefaultJavaImage(imageNames), [imageNames])
    const imageOptions = useMemo(() => imageNames.map(item => ({ label: item, value: item })), [imageNames])
    const nginxImageOptions = useMemo(() => nginxImageNames.map(item => ({ label: item, value: item })), [nginxImageNames])

    const isRequesting = isLoading || isDeletePending || isUploadPending || isBuildStaticPending || isBuildJarPending || isRestartProjectsPending

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

    function onOpenRestartProjectsModal(data: DockerImageItem) {
        if (data.projects.length === 0) return

        setRestartProjectsState({
            imageName: data.name,
            projectNames: data.projects,
        })

        setSelectedRestartProjectNames(data.projects)
        setIsRestartProjectsModalOpen(true)
    }

    function resetRestartProjectsModal() {
        setRestartProjectsState({
            projectNames: [],
        })

        setSelectedRestartProjectNames([])
        setIsRestartProjectsModalOpen(false)
    }

    function onCloseRestartProjectsModal() {
        if (isRestartProjectsPending) return
        resetRestartProjectsModal()
    }

    async function onRestartProjects() {
        if (selectedRestartProjectNames.length === 0) {
            message.error("请至少选择一个项目")
            return
        }

        const key = "restart-projects-after-image-replace"

        try {
            setIsRestartProjectsPending(true)

            message.open({
                key,
                type: "loading",
                content: "重启关联项目中...",
                duration: 0,
            })

            for (const name of selectedRestartProjectNames) {
                await runProjectClient({
                    name,
                    command: ProjectCommand.停止,
                })

                await runProjectClient({
                    name,
                    command: ProjectCommand.启动,
                })
            }

            message.open({
                key,
                type: "success",
                content: "重启关联项目成功",
            })

            resetRestartProjectsModal()
        } catch (error) {
            message.open({
                key,
                type: "error",
                content: error instanceof Error ? error.message : String(error),
            })
        } finally {
            setIsRestartProjectsPending(false)
        }
    }

    async function onFileChange({ data, file }: UploadDockerImageParams) {
        if (!file.name.toLowerCase().endsWith(".tar")) return message.error("仅支持上传 tar 文件")

        const formData = new FormData()
        formData.set("file", file)
        if (data?.name) formData.set("targetName", data.name)

        await uploadDockerImage(formData)
        if (data) onOpenRestartProjectsModal(data)
    }

    async function onDelete(name: string) {
        await deleteDockerImage({ name })
    }

    function onOpenBuildStaticModal(data?: DockerImageItem) {
        setBuildStaticTarget(data)
        setIsBuildStaticModalOpen(true)
    }

    function onOpenBuildJarModal(data?: DockerImageItem) {
        setBuildJarTarget(data)
        setIsBuildJarModalOpen(true)
    }

    function onCloseBuildStaticModal() {
        if (isBuildStaticPending) return
        setBuildStaticTarget(undefined)
        setIsBuildStaticModalOpen(false)
    }

    function onCloseBuildJarModal() {
        if (isBuildJarPending) return
        setBuildJarTarget(undefined)
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

        if (!buildStaticTarget && !values.imageName) {
            message.error("请先填写镜像名")
            return
        }

        const formData = new FormData()
        formData.set("file", staticFile)
        formData.set("nginxImage", values.nginxImage)
        if (buildStaticTarget?.name) formData.set("targetName", buildStaticTarget.name)
        if (values.imageName) formData.set("imageName", values.imageName)

        const target = buildStaticTarget

        await buildStaticDockerImage(formData)
        if (target) onOpenRestartProjectsModal(target)
        setBuildStaticTarget(undefined)
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

        if (!buildJarTarget && !values.imageName) {
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
        if (buildJarTarget?.name) formData.set("targetName", buildJarTarget.name)
        if (values.imageName) formData.set("imageName", values.imageName)
        formData.set("startCommand", values.startCommand)

        const target = buildJarTarget

        await buildJarDockerImage(formData)
        if (target) onOpenRestartProjectsModal(target)
        setBuildJarTarget(undefined)
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
                    <div className="flex flex-wrap justify-center gap-2">
                        <InputFileButton
                            as={Button}
                            size="small"
                            shape="circle"
                            color="default"
                            variant="text"
                            title="上传镜像"
                            disabled={isRequesting}
                            accept=".tar,application/x-tar"
                            onValueChange={file => onFileChange({ data: record, file })}
                            clearAfterChange
                            icon={<IconBrandDocker className="size-4" />}
                        />
                        <Button
                            size="small"
                            shape="circle"
                            color="default"
                            variant="text"
                            title="上传静态文件制作镜像"
                            disabled={isRequesting}
                            icon={<IconBrandReact className="size-4" />}
                            onClick={() => onOpenBuildStaticModal(record)}
                        />
                        <Button
                            size="small"
                            shape="circle"
                            color="default"
                            variant="text"
                            title="上传 Jar 文件制作镜像"
                            disabled={isRequesting}
                            icon={<IconCoffee className="size-4" />}
                            onClick={() => onOpenBuildJarModal(record)}
                        />
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
                    </div>
                )
            },
        },
    ]

    return (
        <div className="flex h-full flex-col gap-4 pt-4">
            <title>镜像管理</title>
            <div className="flex-none px-4">
                <Form<QueryImageFormParams> name="query-image-form" className="gap-y-4" layout="inline" onFinish={setQuery}>
                    <FormItem<QueryImageFormParams> name="name" label="镜像名称">
                        <Input allowClear />
                    </FormItem>
                    <FormItem<QueryImageFormParams> name="project" label="关联项目">
                        <Input allowClear />
                    </FormItem>
                    <FormItem<QueryImageFormParams>>
                        <Button htmlType="submit" type="primary" disabled={isRequesting}>
                            查询
                        </Button>
                    </FormItem>
                    <FormItem<QueryImageFormParams>>
                        <Button htmlType="button" type="text" disabled={isRequesting} onClick={() => setQuery({} as QueryImageFormParams)}>
                            重置
                        </Button>
                    </FormItem>
                    <div className="ml-auto flex items-center gap-2">
                        <InputFileButton
                            as={Button}
                            shape="circle"
                            color="default"
                            variant="text"
                            title="上传镜像"
                            disabled={isRequesting}
                            accept=".tar,application/x-tar"
                            onValueChange={file => onFileChange({ file })}
                            clearAfterChange
                            icon={<IconBrandDocker className="size-4" />}
                        />
                        <Button
                            shape="circle"
                            color="default"
                            variant="text"
                            title="上传静态文件制作镜像"
                            disabled={isRequesting}
                            icon={<IconBrandReact className="size-4" />}
                            onClick={() => onOpenBuildStaticModal()}
                        />
                        <Button
                            shape="circle"
                            color="default"
                            variant="text"
                            title="上传 Jar 文件制作镜像"
                            disabled={isRequesting}
                            icon={<IconCoffee className="size-4" />}
                            onClick={() => onOpenBuildJarModal()}
                        />
                        <Button
                            shape="circle"
                            color="default"
                            variant="text"
                            title="上传 Jar 文件制作镜像"
                            disabled={isRequesting}
                            icon={<RotateCw className="size-4" />}
                            onClick={onRefresh}
                        />
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
                    rowKey={({ name, id }) => `${name}-${id}`}
                    scroll={{ y }}
                />
            </div>
            <Modal
                title={buildStaticTarget ? `上传静态文件制作镜像并替换 ${buildStaticTarget.name}` : "上传静态文件制作镜像"}
                open={isBuildStaticModalOpen}
                onOk={() => buildStaticForm.submit()}
                okText="确认"
                cancelText="取消"
                okButtonProps={{ loading: isBuildStaticPending, disabled: nginxImageOptions.length === 0 }}
                cancelButtonProps={{ disabled: isBuildStaticPending }}
                onCancel={onCloseBuildStaticModal}
            >
                <Form<StaticDockerImageFormParams> form={buildStaticForm} layout="vertical" disabled={isBuildStaticPending} onFinish={onBuildStaticFinish}>
                    {buildStaticTarget ? (
                        <FormItem label="当前镜像">
                            <Input value={buildStaticTarget.name} readOnly />
                        </FormItem>
                    ) : null}
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
                        extra={
                            nginxImageOptions.length === 0
                                ? "本机暂无 nginx 镜像，请先拉取 nginx 镜像"
                                : buildStaticTarget
                                  ? "新镜像会先使用当前镜像名加上传时间标签构建，成功后自动替换当前镜像"
                                  : undefined
                        }
                    >
                        <Select allowClear showSearch options={nginxImageOptions} placeholder="请选择 nginx 镜像" notFoundContent="暂无 nginx 镜像" />
                    </FormItem>
                    {buildStaticTarget ? null : (
                        <FormItem<StaticDockerImageFormParams> name="imageName" label="镜像名" rules={[schemaToRule(dockerImageNameSchema)]}>
                            <Input allowClear placeholder="例如: my-spa:latest" />
                        </FormItem>
                    )}
                </Form>
            </Modal>
            <Modal
                title={buildJarTarget ? `上传 Jar 文件制作镜像并替换 ${buildJarTarget.name}` : "上传 Jar 文件制作镜像"}
                open={isBuildJarModalOpen}
                onOk={() => buildJarForm.submit()}
                okText="确认"
                cancelText="取消"
                okButtonProps={{ loading: isBuildJarPending, disabled: imageOptions.length === 0 }}
                cancelButtonProps={{ disabled: isBuildJarPending }}
                onCancel={onCloseBuildJarModal}
            >
                <Form<JarDockerImageFormParams> form={buildJarForm} layout="vertical" disabled={isBuildJarPending} onFinish={onBuildJarFinish}>
                    {buildJarTarget ? (
                        <FormItem label="当前镜像">
                            <Input value={buildJarTarget.name} readOnly />
                        </FormItem>
                    ) : null}
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
                                  : buildJarTarget
                                    ? "新镜像会先使用当前镜像名加上传时间标签构建，成功后自动替换当前镜像"
                                    : undefined
                        }
                    >
                        <Select allowClear showSearch options={imageOptions} placeholder="请选择 Java 镜像" notFoundContent="暂无基础镜像" />
                    </FormItem>
                    {buildJarTarget ? null : (
                        <FormItem<JarDockerImageFormParams> name="imageName" label="镜像名" rules={[schemaToRule(dockerImageNameSchema)]}>
                            <Input allowClear placeholder="例如: my-app:latest" />
                        </FormItem>
                    )}
                    <FormItem<JarDockerImageFormParams> name="startCommand" label="启动命令" rules={[schemaToRule(dockerStartCommandSchema)]}>
                        <Input allowClear placeholder={DEFAULT_JAR_START_COMMAND} />
                    </FormItem>
                </Form>
            </Modal>
            <Modal
                title={restartProjectsState.imageName ? `重启 ${restartProjectsState.imageName} 关联项目` : "重启关联项目"}
                open={isRestartProjectsModalOpen}
                onOk={onRestartProjects}
                okText="确认"
                cancelText="取消"
                okButtonProps={{ loading: isRestartProjectsPending }}
                cancelButtonProps={{ disabled: isRestartProjectsPending }}
                onCancel={onCloseRestartProjectsModal}
            >
                <Form layout="vertical" disabled={isRestartProjectsPending}>
                    <FormItem label="关联项目" extra="选中的项目会依次执行 docker compose down 和 docker compose up -d">
                        <Checkbox.Group
                            className="flex flex-col gap-2"
                            value={selectedRestartProjectNames}
                            options={restartProjectsState.projectNames.map(item => ({
                                label: item,
                                value: item,
                            }))}
                            onChange={value => setSelectedRestartProjectNames(value as string[])}
                        />
                    </FormItem>
                </Form>
            </Modal>
        </div>
    )
}

export default Page
