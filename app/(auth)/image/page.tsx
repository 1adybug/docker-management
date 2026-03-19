"use client"

import { FC, useEffect, useMemo, useRef, useState } from "react"

import { IconBrandDocker, IconBrandReact, IconCoffee, IconCopy, IconPencil, IconTrash } from "@tabler/icons-react"
import { Button, Checkbox, Form, Input, message, Modal, Popconfirm, Select, Table, TableProps, Tag } from "antd"
import { useForm } from "antd/es/form/Form"
import FormItem from "antd/es/form/FormItem"
import { InputFileButton } from "deepsea-components"
import { formatTime, showTotal } from "deepsea-tools"
import { RotateCw } from "lucide-react"
import Link from "next/link"
import { Columns, schemaToRule, useScroll } from "soda-antd"
import { useQueryState } from "soda-next"

import { useBuildJarDockerImage } from "@/hooks/useBuildJarDockerImage"
import { useBuildStaticDockerImage } from "@/hooks/useBuildStaticDockerImage"
import { useCopyDockerImage } from "@/hooks/useCopyDockerImage"
import { useDeleteDockerImage } from "@/hooks/useDeleteDockerImage"
import { useQueryDockerImageDetail } from "@/hooks/useQueryDockerImageDetail"
import { useRenameDockerImage } from "@/hooks/useRenameDockerImage"
import { runProjectClient } from "@/hooks/useRunProject"
import { useUploadDockerImage } from "@/hooks/useUploadDockerImage"

import { getParser } from "@/schemas"
import { dockerImageNameSchema } from "@/schemas/dockerImageName"
import { DockerImageSortByParams, dockerImageSortBySchema } from "@/schemas/dockerImageSortBy"
import { dockerImageTagSchema } from "@/schemas/dockerImageTag"
import { dockerStartCommandSchema } from "@/schemas/dockerStartCommand"
import { pageNumParser } from "@/schemas/pageNum"
import { pageSizeParser } from "@/schemas/pageSize"
import { ProjectCommand } from "@/schemas/projectCommand"
import { SortOrderParams, sortOrderSchema } from "@/schemas/sortOrder"

import { DockerImageContainerItem, DockerImageItem, DockerImageProjectItem } from "@/shared/queryDockerImageDetail"

import { getSortOrder } from "@/utils/getSortOrder"

export interface DockerImageFilterParams {
    name?: string
    repository?: string
    project?: string
}

export interface QueryImageFormParams extends DockerImageFilterParams {
    pageNum?: number
    pageSize?: number
    sortBy?: DockerImageSortByParams
    sortOrder?: SortOrderParams
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

export interface ImageTagFormParams {
    tag?: string
    targetName?: string
}

export interface UploadDockerImageParams {
    data?: DockerImageItem
    file: File
}

export interface RestartProjectsState {
    imageName?: string
    projectItems: DockerImageProjectItem[]
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

function compareName(first?: string, second?: string) {
    return (first?.trim() ?? "").localeCompare(second?.trim() ?? "", "zh-CN", { numeric: true })
}

function getCreatedAtTimestamp(value?: string) {
    const timestamp = Date.parse(value ?? "")
    return Number.isNaN(timestamp) ? undefined : timestamp
}

function compareOptionalNumber(first?: number, second?: number) {
    if (first === undefined && second === undefined) return 0
    if (first === undefined) return 1
    if (second === undefined) return -1
    return first - second
}

function getDockerSizeValue(value?: string) {
    const match = value?.trim().match(/^([\d.]+)\s*([a-zA-Z]+)$/u)
    if (!match) return undefined

    const size = Number(match[1])

    if (Number.isNaN(size)) return undefined

    const unitMap = {
        B: 1,
        KB: 1024,
        MB: 1024 ** 2,
        GB: 1024 ** 3,
        TB: 1024 ** 4,
        PB: 1024 ** 5,
    }

    const unit = match[2].toUpperCase()
    const factor = unitMap[unit as keyof typeof unitMap]

    if (!factor) return undefined

    return size * factor
}

function compareCreatedAt(first?: string, second?: string) {
    const timestampDiff = compareOptionalNumber(getCreatedAtTimestamp(first), getCreatedAtTimestamp(second))
    if (timestampDiff !== 0) return timestampDiff
    return compareName(first, second)
}

function compareSize(first?: string, second?: string) {
    const sizeDiff = compareOptionalNumber(getDockerSizeValue(first), getDockerSizeValue(second))
    if (sizeDiff !== 0) return sizeDiff
    return compareName(first, second)
}

function getProjectDisplayName(projectItems: DockerImageProjectItem[], name: string) {
    return projectItems.find(item => item.name === name)?.displayName ?? name
}

function getProjectDisplaySortText(projectItems: DockerImageProjectItem[], names: string[]) {
    return names
        .map(item => getProjectDisplayName(projectItems, item))
        .sort(compareName)
        .join(" | ")
}

function getContainerSortText(containerItems: DockerImageContainerItem[]) {
    return containerItems
        .map(item => item.name || item.id)
        .filter(Boolean)
        .sort(compareName)
        .join(" | ")
}

function getProjectHref(name: string) {
    return `/project?name=${encodeURIComponent(name)}`
}

function getContainerHref(name?: string) {
    const containerName = name?.trim()
    if (!containerName) return "/container"
    return `/container?name=${encodeURIComponent(containerName)}`
}

function getContainerListHref(imageName?: string) {
    const currentImageName = imageName?.trim()
    if (!currentImageName) return "/container"
    return `/container?image=${encodeURIComponent(currentImageName)}`
}

function getDockerContainerNamesText(containerItems: DockerImageContainerItem[]) {
    const names = containerItems.map(item => item.name).filter(Boolean)

    if (names.length === 0) return ""
    if (names.length <= 3) return names.join("、")

    return `${names.slice(0, 3).join("、")} 等 ${names.length} 个容器`
}

function getDockerImageNameByRepositoryAndTag(repository: string, tag: string) {
    return `${repository.trim()}:${tag.trim()}`
}

function hasImageTag(value: string) {
    const lastSlashIndex = value.lastIndexOf("/")
    const lastColonIndex = value.lastIndexOf(":")
    return lastColonIndex > lastSlashIndex
}

function getImageFilterNames(value?: string) {
    const imageName = value?.trim()

    if (!imageName) return []
    if (hasImageTag(imageName)) return [imageName]

    return [imageName, `${imageName}:latest`]
}

function compareProjects(first: DockerImageItem, second: DockerImageItem) {
    const textDiff = compareName(getProjectDisplaySortText(first.projectItems, first.projects), getProjectDisplaySortText(second.projectItems, second.projects))

    if (textDiff !== 0) return textDiff
    return first.projects.length - second.projects.length
}

function compareContainers(first: DockerImageContainerItem[], second: DockerImageContainerItem[]) {
    const textDiff = compareName(getContainerSortText(first), getContainerSortText(second))
    if (textDiff !== 0) return textDiff
    return first.length - second.length
}

function compareTag(first?: string, second?: string, sortOrder?: SortOrderParams) {
    const firstTag = first?.trim().toLowerCase() ?? ""
    const secondTag = second?.trim().toLowerCase() ?? ""
    const isFirstLatest = firstTag === "latest"
    const isSecondLatest = secondTag === "latest"

    if (isFirstLatest && !isSecondLatest) return -1
    if (!isFirstLatest && isSecondLatest) return 1

    const result = compareName(first, second)
    return sortOrder === "desc" ? result * -1 : result
}

function compareDockerImage(first: DockerImageItem, second: DockerImageItem, sortBy?: DockerImageSortByParams, sortOrder?: SortOrderParams) {
    switch (sortBy) {
        case "repository":
            return compareName(first.repository, second.repository) || compareName(first.tag, second.tag) || compareName(first.id, second.id)
        case "tag":
            return compareTag(first.tag, second.tag, sortOrder) || compareName(first.repository, second.repository) || compareName(first.id, second.id)
        case "id":
            return compareName(first.id, second.id) || compareName(first.name, second.name)
        case "size":
            return compareSize(first.size, second.size) || compareName(first.name, second.name)
        case "createdAt":
            return compareCreatedAt(first.createdAt, second.createdAt) || compareName(first.name, second.name)
        case "projects":
            return compareProjects(first, second) || compareName(first.name, second.name)
        case "containerItems":
            return compareContainers(first.containerItems, second.containerItems) || compareName(first.name, second.name)
        default:
            return compareName(first.name, second.name) || compareName(first.id, second.id)
    }
}

function getSortResult(result: number, sortOrder?: SortOrderParams) {
    return sortOrder === "desc" ? result * -1 : result
}

function getSorterOrder(order?: string | null) {
    if (order === "ascend") return "asc"
    if (order === "descend") return "desc"
    return undefined
}

const Page: FC = () => {
    const { data, isLoading, refetch } = useQueryDockerImageDetail()
    const { mutateAsync: deleteDockerImage, isPending: isDeletePending } = useDeleteDockerImage()
    const { mutateAsync: uploadDockerImage, isPending: isUploadPending } = useUploadDockerImage()
    const { mutateAsync: buildJarDockerImage, isPending: isBuildJarPending } = useBuildJarDockerImage()
    const { mutateAsync: buildStaticDockerImage, isPending: isBuildStaticPending } = useBuildStaticDockerImage()
    const { mutateAsync: renameDockerImage, isPending: isRenamePending } = useRenameDockerImage()
    const { mutateAsync: copyDockerImage, isPending: isCopyPending } = useCopyDockerImage()

    const [query, setQuery] = useQueryState({
        keys: ["name", "repository", "project"],
        parse: {
            pageNum: pageNumParser,
            pageSize: pageSizeParser,
            sortBy: getParser(dockerImageSortBySchema.optional().catch(undefined)),
            sortOrder: getParser(sortOrderSchema.optional().catch(undefined)),
        },
    })

    const [buildStaticForm] = useForm<StaticDockerImageFormParams>()
    const [buildJarForm] = useForm<JarDockerImageFormParams>()
    const [renameForm] = useForm<ImageTagFormParams>()
    const [copyForm] = useForm<ImageTagFormParams>()
    const [queryForm] = useForm<QueryImageFormParams>()
    const container = useRef<HTMLDivElement>(null)
    const [staticFile, setStaticFile] = useState<File | undefined>(undefined)
    const [jarFile, setJarFile] = useState<File | undefined>(undefined)
    const [isBuildStaticModalOpen, setIsBuildStaticModalOpen] = useState(false)
    const [isBuildJarModalOpen, setIsBuildJarModalOpen] = useState(false)
    const [isRenameModalOpen, setIsRenameModalOpen] = useState(false)
    const [isCopyModalOpen, setIsCopyModalOpen] = useState(false)
    const [isRestartProjectsModalOpen, setIsRestartProjectsModalOpen] = useState(false)
    const [isRestartProjectsPending, setIsRestartProjectsPending] = useState(false)
    const [buildStaticTarget, setBuildStaticTarget] = useState<DockerImageItem | undefined>(undefined)
    const [buildJarTarget, setBuildJarTarget] = useState<DockerImageItem | undefined>(undefined)
    const [renameTarget, setRenameTarget] = useState<DockerImageItem | undefined>(undefined)
    const [copyTarget, setCopyTarget] = useState<DockerImageItem | undefined>(undefined)

    const [restartProjectsState, setRestartProjectsState] = useState<RestartProjectsState>({
        projectItems: [],
    })

    const [selectedRestartProjectNames, setSelectedRestartProjectNames] = useState<string[]>([])
    const { y } = useScroll(container, { paginationMargin: 32 })
    const pageNum = query.pageNum ?? 1
    const pageSize = query.pageSize ?? 10

    const imageNames = useMemo(() => Array.from(new Set((data ?? []).filter(item => !item.isDangling).map(item => item.name))), [data])

    const repositoryOptions = useMemo(
        () =>
            Array.from(new Set((data ?? []).map(item => item.repository).filter(Boolean)))
                .sort(compareName)
                .map(item => ({ label: item, value: item })),
        [data],
    )

    const projectOptions = useMemo(() => {
        const projectMap = new Map<string, string>()

        ;(data ?? []).forEach(item => {
            item.projectItems.forEach(project => {
                projectMap.set(project.name, project.displayName)
            })
        })

        return Array.from(projectMap.entries())
            .sort((first, second) => compareName(first[1], second[1]))
            .map(([value, label]) => ({ label, value }))
    }, [data])

    const nginxImageNames = useMemo(() => imageNames.filter(name => name.startsWith("nginx:")), [imageNames])
    const defaultNginxImage = useMemo(() => getDefaultNginxImage(nginxImageNames), [nginxImageNames])
    const defaultJavaImage = useMemo(() => getDefaultJavaImage(imageNames), [imageNames])

    useEffect(() => {
        queryForm.resetFields()

        queryForm.setFieldsValue({
            repository: query.repository,
            project: query.project,
        })
    }, [query, queryForm])

    const imageOptions = useMemo(() => imageNames.map(item => ({ label: item, value: item })), [imageNames])
    const nginxImageOptions = useMemo(() => nginxImageNames.map(item => ({ label: item, value: item })), [nginxImageNames])

    const isRequesting =
        isLoading ||
        isDeletePending ||
        isUploadPending ||
        isBuildStaticPending ||
        isBuildJarPending ||
        isRenamePending ||
        isCopyPending ||
        isRestartProjectsPending

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

    useEffect(() => {
        if (!isRenameModalOpen) {
            renameForm.resetFields()
            return
        }

        renameForm.setFieldsValue({
            tag: renameTarget?.tag,
            targetName: renameTarget?.isDangling ? undefined : renameTarget?.name,
        })
    }, [isRenameModalOpen, renameForm, renameTarget])

    useEffect(() => {
        if (!isCopyModalOpen) {
            copyForm.resetFields()
            return
        }

        copyForm.setFieldsValue({
            tag: copyTarget?.tag,
        })
    }, [copyForm, copyTarget, isCopyModalOpen])

    function onRefresh() {
        refetch()
    }

    function onOpenRestartProjectsModal(data: DockerImageItem) {
        if (data.projects.length === 0) return

        setRestartProjectsState({
            imageName: data.name,
            projectItems: data.projectItems,
        })

        setSelectedRestartProjectNames(data.projects)
        setIsRestartProjectsModalOpen(true)
    }

    function resetRestartProjectsModal() {
        setRestartProjectsState({
            projectItems: [],
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

        const result = await uploadDockerImage(formData)
        if (data && !result.skipFollowUp) onOpenRestartProjectsModal(data)
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

    function onOpenRenameModal(data: DockerImageItem) {
        setRenameTarget(data)
        setIsRenameModalOpen(true)
    }

    function onOpenCopyModal(data: DockerImageItem) {
        setCopyTarget(data)
        setIsCopyModalOpen(true)
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

    function resetRenameModal() {
        setRenameTarget(undefined)
        setIsRenameModalOpen(false)
    }

    function resetCopyModal() {
        setCopyTarget(undefined)
        setIsCopyModalOpen(false)
    }

    function onCloseRenameModal() {
        if (isRenamePending) return
        resetRenameModal()
    }

    function onCloseCopyModal() {
        if (isCopyPending) return
        resetCopyModal()
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

        const result = await buildStaticDockerImage(formData)
        if (target && !result.skipFollowUp) onOpenRestartProjectsModal(target)
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

        const result = await buildJarDockerImage(formData)
        if (target && !result.skipFollowUp) onOpenRestartProjectsModal(target)
        setBuildJarTarget(undefined)
        setIsBuildJarModalOpen(false)
    }

    async function onRename(values: ImageTagFormParams) {
        if (!renameTarget) return
        const nextTag = values.tag?.trim()
        const nextTargetName = values.targetName?.trim()
        const targetName = renameTarget.isDangling
            ? nextTargetName
            : nextTag
              ? getDockerImageNameByRepositoryAndTag(renameTarget.repository, nextTag)
              : undefined

        if (!targetName) {
            message.error(renameTarget.isDangling ? "请先填写新的镜像名" : "请先填写新的 tag")
            return
        }

        await renameDockerImage({
            name: renameTarget.name,
            targetName,
        })

        resetRenameModal()
    }

    function onRenameFinish(values: ImageTagFormParams) {
        if (!renameTarget) return

        if (renameTarget.containerItems.length === 0) {
            void onRename(values)
            return
        }

        Modal.confirm({
            title: "确认重命名镜像",
            okText: "确认重命名",
            cancelText: "取消",
            content: (
                <div className="space-y-2 text-sm text-slate-600">
                    <div>当前镜像已关联容器：{getDockerContainerNamesText(renameTarget.containerItems)}</div>
                    <div>重命名后，相关容器后续重建或重新创建时可能受到影响，是否继续？</div>
                </div>
            ),
            onOk() {
                return onRename(values)
            },
        })
    }

    async function onCopyFinish(values: ImageTagFormParams) {
        const nextTag = values.tag?.trim()

        if (!copyTarget) return

        if (!nextTag) {
            message.error("请先填写新的 tag")
            return
        }

        await copyDockerImage({
            name: copyTarget.name,
            tag: nextTag,
        })

        resetCopyModal()
    }

    const filteredData = useMemo(() => {
        const list = data ?? []
        const imageNames = getImageFilterNames(query.name)
        const repository = query.repository?.trim()
        const project = query.project?.trim()

        return list.filter(item => {
            const isNameMatch = imageNames.length > 0 ? imageNames.includes(item.name) || imageNames.includes(item.reference) : true
            const isRepositoryMatch = repository ? item.repository === repository : true
            const isProjectMatch = project ? item.projects.includes(project) : true
            return isNameMatch && isRepositoryMatch && isProjectMatch
        })
    }, [data, query.name, query.project, query.repository])

    const sortedData = useMemo(() => {
        if (!query.sortBy) return filteredData

        return filteredData.slice().sort((first, second) => {
            if (query.sortBy === "tag") return compareDockerImage(first, second, query.sortBy, query.sortOrder)
            return getSortResult(compareDockerImage(first, second, query.sortBy, query.sortOrder), query.sortOrder)
        })
    }, [filteredData, query.sortBy, query.sortOrder])

    const pagedData = useMemo(() => {
        const start = (pageNum - 1) * pageSize
        const end = start + pageSize
        return sortedData.slice(start, end)
    }, [pageNum, pageSize, sortedData])

    const onTableChange: TableProps<DockerImageItem>["onChange"] = function onTableChange(pagination, filters, sorter) {
        if (Array.isArray(sorter)) return

        const sortBy = (typeof sorter.columnKey === "string" ? sorter.columnKey : typeof sorter.field === "string" ? sorter.field : undefined) ?? undefined

        setQuery(prev => ({
            ...prev,
            pageNum: pagination.current ?? prev.pageNum,
            pageSize: pagination.pageSize ?? prev.pageSize,
            sortBy: sortBy as DockerImageSortByParams | undefined,
            sortOrder: getSorterOrder(sorter.order),
        }))
    }

    function onResetQuery() {
        queryForm.resetFields()
        setQuery({} as QueryImageFormParams)
    }

    const columns: Columns<DockerImageItem> = [
        {
            title: "镜像名称",
            dataIndex: "repository",
            key: "repository",
            align: "left",
            sorter: true,
            sortOrder: getSortOrder(query, "repository"),
            render(value: string) {
                if (value === "<none>") return <Tag>&lt;none&gt;</Tag>
                return value || "-"
            },
        },
        {
            title: "Tag",
            dataIndex: "tag",
            key: "tag",
            align: "center",
            sorter: true,
            sortOrder: getSortOrder(query, "tag"),
            render(value: string) {
                if (value === "<none>") return <Tag>&lt;none&gt;</Tag>
                return value || "-"
            },
        },
        {
            title: "镜像 ID",
            dataIndex: "id",
            key: "id",
            align: "center",
            sorter: true,
            sortOrder: getSortOrder(query, "id"),
            render(value: string) {
                return value ? value.slice(0, 12) : "-"
            },
        },
        {
            title: "大小",
            dataIndex: "size",
            key: "size",
            align: "center",
            sorter: true,
            sortOrder: getSortOrder(query, "size"),
        },
        {
            title: "创建时间",
            dataIndex: "createdAt",
            key: "createdAt",
            align: "center",
            sorter: true,
            sortOrder: getSortOrder(query, "createdAt"),
            render(value: string) {
                return formatTime(value)
            },
        },
        {
            title: "关联项目",
            dataIndex: "projects",
            key: "projects",
            align: "center",
            sorter: true,
            sortOrder: getSortOrder(query, "projects"),
            render(value: string[], record) {
                if (!value || value.length === 0) return "-"
                return (
                    <div className="flex flex-wrap justify-center gap-1">
                        {value.map(item => (
                            <Link key={item} href={getProjectHref(item)}>
                                <Tag color="blue">{getProjectDisplayName(record.projectItems, item)}</Tag>
                            </Link>
                        ))}
                    </div>
                )
            },
        },
        {
            title: "关联容器",
            dataIndex: "containerItems",
            key: "containerItems",
            align: "center",
            sorter: true,
            sortOrder: getSortOrder(query, "containerItems"),
            render(value: DockerImageContainerItem[], record) {
                if (!value || value.length === 0) return "-"

                const visibleContainerItems = value.slice(0, 3)
                const hiddenCount = value.length - visibleContainerItems.length

                return (
                    <div className="flex flex-wrap justify-center gap-1">
                        {visibleContainerItems.map(item => (
                            <Link key={item.id || item.name} href={getContainerHref(item.name)}>
                                <Tag color="cyan">{item.name || item.id}</Tag>
                            </Link>
                        ))}
                        {hiddenCount > 0 ? (
                            <Link href={getContainerListHref(record.name)}>
                                <Tag>{`等 ${value.length} 个`}</Tag>
                            </Link>
                        ) : null}
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
                        {record.isDangling ? null : (
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
                        )}
                        {record.isDangling ? null : (
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
                        )}
                        {record.isDangling ? null : (
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
                        )}
                        <Button
                            size="small"
                            shape="circle"
                            color="default"
                            variant="text"
                            title={record.isDangling ? "重命名悬空镜像" : "重命名镜像 tag"}
                            disabled={isRequesting}
                            icon={<IconPencil className="size-4" />}
                            onClick={() => onOpenRenameModal(record)}
                        />
                        {record.isDangling ? null : (
                            <Button
                                size="small"
                                shape="circle"
                                color="default"
                                variant="text"
                                title="复制镜像 tag"
                                disabled={isRequesting}
                                icon={<IconCopy className="size-4" />}
                                onClick={() => onOpenCopyModal(record)}
                            />
                        )}
                        <Popconfirm title="确认删除镜像" description="删除后可能影响相关容器" onConfirm={() => onDelete(record.reference)}>
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
                <Form<QueryImageFormParams> name="query-image-form" form={queryForm} className="gap-y-4" layout="inline" onFinish={setQuery}>
                    <FormItem<QueryImageFormParams> name="repository" label="镜像名称">
                        <Select className="!w-48" allowClear showSearch options={repositoryOptions} placeholder="选择镜像名称" />
                    </FormItem>
                    <FormItem<QueryImageFormParams> name="project" label="关联项目">
                        <Select className="!w-48" allowClear showSearch options={projectOptions} placeholder="选择关联项目" />
                    </FormItem>
                    <FormItem<QueryImageFormParams>>
                        <Button htmlType="submit" type="primary" disabled={isRequesting}>
                            查询
                        </Button>
                    </FormItem>
                    <FormItem<QueryImageFormParams>>
                        <Button htmlType="button" type="text" disabled={isRequesting} onClick={onResetQuery}>
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
                    onChange={onTableChange}
                    pagination={{
                        current: pageNum,
                        pageSize,
                        total: sortedData.length,
                        showTotal,
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
                title={renameTarget ? `重命名 ${renameTarget.name}` : "重命名镜像"}
                open={isRenameModalOpen}
                onOk={() => renameForm.submit()}
                okText="确认"
                cancelText="取消"
                okButtonProps={{ loading: isRenamePending }}
                cancelButtonProps={{ disabled: isRenamePending }}
                onCancel={onCloseRenameModal}
            >
                <Form<ImageTagFormParams> form={renameForm} layout="vertical" disabled={isRenamePending} onFinish={onRenameFinish}>
                    {renameTarget?.isDangling ? (
                        <FormItem<ImageTagFormParams>
                            name="targetName"
                            label="新镜像名"
                            extra="悬空镜像没有可复用的仓库名，请直接输入完整镜像名，例如：nginx:latest"
                            rules={[schemaToRule(dockerImageNameSchema)]}
                        >
                            <Input autoComplete="off" allowClear placeholder="例如：my-app:latest" />
                        </FormItem>
                    ) : (
                        <FormItem<ImageTagFormParams>
                            name="tag"
                            label="新 tag"
                            extra={renameTarget ? `仓库名保持为 ${renameTarget.repository}` : undefined}
                            rules={[schemaToRule(dockerImageTagSchema)]}
                        >
                            <Input autoComplete="off" allowClear placeholder="请输入新的 tag" />
                        </FormItem>
                    )}
                </Form>
            </Modal>
            <Modal
                title={copyTarget ? `复制 ${copyTarget.name}` : "复制镜像"}
                open={isCopyModalOpen}
                onOk={() => copyForm.submit()}
                okText="确认"
                cancelText="取消"
                okButtonProps={{ loading: isCopyPending }}
                cancelButtonProps={{ disabled: isCopyPending }}
                onCancel={onCloseCopyModal}
            >
                <Form<ImageTagFormParams> form={copyForm} layout="vertical" disabled={isCopyPending} onFinish={onCopyFinish}>
                    <FormItem<ImageTagFormParams>
                        name="tag"
                        label="新 tag"
                        extra={copyTarget ? `仓库名保持为 ${copyTarget.repository}` : undefined}
                        rules={[schemaToRule(dockerImageTagSchema)]}
                    >
                        <Input autoComplete="off" allowClear placeholder="请输入新的 tag" />
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
                            options={restartProjectsState.projectItems.map(item => ({
                                label: item.displayName,
                                value: item.name,
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
