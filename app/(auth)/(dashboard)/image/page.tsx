"use client"

import { type FC, useEffect, useMemo, useState } from "react"

import { IconBrandReact, IconCoffee } from "@tabler/icons-react"
import { useForm } from "@tanstack/react-form"
import { useQueryClient } from "@tanstack/react-query"
import type { ColumnDef, SortingState, Updater } from "@tanstack/react-table"
import { formatTime } from "deepsea-tools"
import { CopyIcon, DownloadIcon, LoaderCircleIcon, PencilIcon, RefreshCwIcon, Trash2Icon, UploadIcon } from "lucide-react"
import Link from "next/link"
import { useQueryState } from "soda-next"

import { ConfirmButton } from "@/components/ConfirmButton"
import { DataTable } from "@/components/DataTable"

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import { useBuildJarDockerImage } from "@/hooks/useBuildJarDockerImage"
import { useBuildStaticDockerImage } from "@/hooks/useBuildStaticDockerImage"
import { useCopyDockerImage } from "@/hooks/useCopyDockerImage"
import { deleteDockerImageClient, useDeleteDockerImage } from "@/hooks/useDeleteDockerImage"
import { usePullDockerImage } from "@/hooks/usePullDockerImage"
import { useQueryDockerImageDetail } from "@/hooks/useQueryDockerImageDetail"
import { useRenameDockerImage } from "@/hooks/useRenameDockerImage"
import { runProjectClient } from "@/hooks/useRunProject"
import { useUploadDockerImage } from "@/hooks/useUploadDockerImage"

import { getParser } from "@/schemas"
import { dockerImageNameSchema } from "@/schemas/dockerImageName"
import { type DockerImageSortByParams, dockerImageSortBySchema } from "@/schemas/dockerImageSortBy"
import { dockerImageTagSchema } from "@/schemas/dockerImageTag"
import { dockerStartCommandSchema } from "@/schemas/dockerStartCommand"
import { pageNumParser } from "@/schemas/pageNum"
import { pageSizeParser } from "@/schemas/pageSize"
import { ProjectCommand } from "@/schemas/projectCommand"
import { type SortOrderParams, sortOrderSchema } from "@/schemas/sortOrder"

import type { DockerImageContainerItem, DockerImageItem, DockerImageProjectItem } from "@/shared/queryDockerImageDetail"

import { getOnBlurValidator } from "@/utils/getOnBlurValidator"
import { cn } from "@/utils/shadcn"
import { toast } from "@/utils/toast"

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
    imageName: string
    nginxImage: string
}

export interface JarDockerImageFormParams {
    imageName: string
    javaImage: string
    startCommand: string
}

export interface ImageTagFormParams {
    tag: string
    targetName: string
}

export interface UploadDockerImageParams {
    data?: DockerImageItem
    file: File
}

export interface RestartProjectsState {
    imageName?: string
    projectItems: DockerImageProjectItem[]
}

export interface BatchDeleteDockerImageErrorItem {
    name: string
    message: string
}

interface FilePickerProps {
    accept: string
    disabled?: boolean
    iconOnly?: boolean
    title: string
    onValueChange: (file: File) => void | Promise<void>
}

interface SelectOption {
    label: string
    value: string
}

interface OptionalStringFormFieldState {
    value?: string
}

interface OptionalStringFormField {
    state: OptionalStringFormFieldState
    handleChange: (value?: string) => void
}

const DEFAULT_JAR_START_COMMAND = "java -jar app.jar"
const allSelectValue = "__all"

const FilePicker: FC<FilePickerProps> = ({ accept, disabled, iconOnly, title, onValueChange }) => (
    <Button asChild size={iconOnly ? "icon-xs" : "default"} variant={iconOnly ? "ghost" : "outline"}>
        <label className={cn("cursor-pointer", disabled && "pointer-events-none opacity-50")} title={title}>
            <UploadIcon />
            {!iconOnly && title}
            <input
                className="sr-only"
                type="file"
                accept={accept}
                disabled={disabled}
                onChange={event => {
                    const file = event.target.files?.[0]
                    event.target.value = ""
                    if (file) void onValueChange(file)
                }}
            />
        </label>
    </Button>
)

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

    return imageNames.find(item => /eclipse-temurin|openjdk|amazoncorretto|liberica|sapmachine|semeru|dragonwell/iu.test(item))
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

const dockerSizeRegex = /^([+-]?(?:\d+(?:\.\d+)?|\.\d+)(?:[eE][+-]?\d+)?)\s*([a-zA-Z]+)$/u

function formatDockerSize(value?: string) {
    const match = value?.trim().match(dockerSizeRegex)
    if (!match) return value || "-"
    const size = Number(match[1])
    if (Number.isNaN(size)) return value || "-"
    return `${size.toLocaleString("en-US", { useGrouping: false, maximumFractionDigits: 20 })}${match[2]}`
}

function getDockerSizeValue(value?: string) {
    const match = value?.trim().match(dockerSizeRegex)
    if (!match) return undefined
    const size = Number(match[1])
    if (Number.isNaN(size)) return undefined

    const unitMap = { B: 1, KB: 1024, MB: 1024 ** 2, GB: 1024 ** 3, TB: 1024 ** 4, PB: 1024 ** 5 }

    return size * (unitMap[match[2].toUpperCase() as keyof typeof unitMap] ?? 0) || undefined
}

function compareCreatedAt(first?: string, second?: string) {
    return compareOptionalNumber(getCreatedAtTimestamp(first), getCreatedAtTimestamp(second)) || compareName(first, second)
}

function compareSize(first?: string, second?: string) {
    return compareOptionalNumber(getDockerSizeValue(first), getDockerSizeValue(second)) || compareName(first, second)
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
    return name?.trim() ? `/container?name=${encodeURIComponent(name.trim())}` : "/container"
}

function getContainerListHref(imageName?: string) {
    return imageName?.trim() ? `/container?image=${encodeURIComponent(imageName.trim())}` : "/container"
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
    return value.lastIndexOf(":") > value.lastIndexOf("/")
}

function getImageFilterNames(value?: string) {
    const imageName = value?.trim()
    if (!imageName) return []
    return hasImageTag(imageName) ? [imageName] : [imageName, `${imageName}:latest`]
}

function compareProjects(first: DockerImageItem, second: DockerImageItem) {
    return (
        compareName(getProjectDisplaySortText(first.projectItems, first.projects), getProjectDisplaySortText(second.projectItems, second.projects)) ||
        first.projects.length - second.projects.length
    )
}

function compareContainers(first: DockerImageContainerItem[], second: DockerImageContainerItem[]) {
    return compareName(getContainerSortText(first), getContainerSortText(second)) || first.length - second.length
}

function compareTag(first?: string, second?: string, sortOrder?: SortOrderParams) {
    const firstTag = first?.trim().toLowerCase() ?? ""
    const secondTag = second?.trim().toLowerCase() ?? ""
    if (firstTag === "latest" && secondTag !== "latest") return -1
    if (firstTag !== "latest" && secondTag === "latest") return 1
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

const Page: FC = () => {
    const { data, isLoading, refetch } = useQueryDockerImageDetail()
    const queryClient = useQueryClient()
    const { mutateAsync: deleteDockerImage, isPending: isDeletePending } = useDeleteDockerImage()
    const { mutateAsync: uploadDockerImage, isPending: isUploadPending } = useUploadDockerImage()
    const { mutateAsync: pullDockerImage, isPending: isPullPending } = usePullDockerImage()
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

    const [staticFile, setStaticFile] = useState<File>()
    const [jarFile, setJarFile] = useState<File>()
    const [isBuildStaticOpen, setIsBuildStaticOpen] = useState(false)
    const [isBuildJarOpen, setIsBuildJarOpen] = useState(false)
    const [isRenameOpen, setIsRenameOpen] = useState(false)
    const [isRenameConfirmOpen, setIsRenameConfirmOpen] = useState(false)
    const [isCopyOpen, setIsCopyOpen] = useState(false)
    const [isRestartProjectsOpen, setIsRestartProjectsOpen] = useState(false)
    const [isRestartProjectsPending, setIsRestartProjectsPending] = useState(false)
    const [isBatchDeletePending, setIsBatchDeletePending] = useState(false)
    const [isBatchDeleteConfirmOpen, setIsBatchDeleteConfirmOpen] = useState(false)
    const [batchDeleteErrors, setBatchDeleteErrors] = useState<BatchDeleteDockerImageErrorItem[]>([])
    const [buildStaticTarget, setBuildStaticTarget] = useState<DockerImageItem>()
    const [buildJarTarget, setBuildJarTarget] = useState<DockerImageItem>()
    const [renameTarget, setRenameTarget] = useState<DockerImageItem>()
    const [copyTarget, setCopyTarget] = useState<DockerImageItem>()
    const [pendingRenameValues, setPendingRenameValues] = useState<ImageTagFormParams>()
    const [restartProjectsState, setRestartProjectsState] = useState<RestartProjectsState>({ projectItems: [] })
    const [selectedRestartProjectNames, setSelectedRestartProjectNames] = useState<string[]>([])
    const [selectedImageReferences, setSelectedImageReferences] = useState<string[]>([])
    const pageNum = query.pageNum ?? 1
    const pageSize = query.pageSize ?? 10

    const queryForm = useForm({
        defaultValues: { repository: query.repository, project: query.project } as DockerImageFilterParams,
        onSubmit({ value }) {
            setQuery(previous => ({ ...previous, repository: value.repository, project: value.project, pageNum: 1 }))
        },
    })

    const buildStaticForm = useForm({
        defaultValues: { imageName: "", nginxImage: "" } as StaticDockerImageFormParams,
        onSubmit: ({ value }) => onBuildStaticFinish(value),
    })

    const buildJarForm = useForm({
        defaultValues: { imageName: "", javaImage: "", startCommand: DEFAULT_JAR_START_COMMAND } as JarDockerImageFormParams,
        onSubmit: ({ value }) => onBuildJarFinish(value),
    })

    const renameForm = useForm({
        defaultValues: { tag: "", targetName: "" } as ImageTagFormParams,
        onSubmit: ({ value }) => onRenameFinish(value),
    })

    const copyForm = useForm({
        defaultValues: { tag: "", targetName: "" } as ImageTagFormParams,
        onSubmit: ({ value }) => onCopyFinish(value),
    })

    const imageNames = useMemo(() => Array.from(new Set((data ?? []).filter(item => !item.isDangling).map(item => item.name))), [data])
    const repositoryOptions = useMemo(() => Array.from(new Set((data ?? []).map(item => item.repository).filter(Boolean))).sort(compareName), [data])

    const projectOptions = useMemo(() => {
        const projectMap = new Map<string, string>()
        ;(data ?? []).forEach(item => void item.projectItems.forEach(project => void projectMap.set(project.name, project.displayName)))
        return Array.from(projectMap.entries()).sort((first, second) => compareName(first[1], second[1]))
    }, [data])

    const nginxImageNames = useMemo(() => imageNames.filter(name => name.startsWith("nginx:")), [imageNames])
    const defaultNginxImage = useMemo(() => getDefaultNginxImage(nginxImageNames), [nginxImageNames])
    const defaultJavaImage = useMemo(() => getDefaultJavaImage(imageNames), [imageNames])
    const isRequesting =
        isLoading ||
        isDeletePending ||
        isUploadPending ||
        isPullPending ||
        isBuildStaticPending ||
        isBuildJarPending ||
        isRenamePending ||
        isCopyPending ||
        isRestartProjectsPending ||
        isBatchDeletePending

    useEffect(() => void queryForm.reset({ repository: query.repository, project: query.project }), [query.project, query.repository, queryForm])

    useEffect(() => {
        const referenceSet = new Set((data ?? []).map(item => item.reference))
        setSelectedImageReferences(previous => previous.filter(item => referenceSet.has(item)))
    }, [data])

    function resetRestartProjectsDialog() {
        setRestartProjectsState({ projectItems: [] })
        setSelectedRestartProjectNames([])
        setIsRestartProjectsOpen(false)
    }

    function onOpenRestartProjectsDialog(target: DockerImageItem) {
        if (target.projects.length === 0) return
        setRestartProjectsState({ imageName: target.name, projectItems: target.projectItems })
        setSelectedRestartProjectNames(target.projects)
        setIsRestartProjectsOpen(true)
    }

    async function onRestartProjects() {
        if (selectedRestartProjectNames.length === 0) {
            toast.error("请至少选择一个项目")
            return
        }

        const toastId = toast.loading("重启关联项目中...")

        try {
            setIsRestartProjectsPending(true)
            for (const name of selectedRestartProjectNames) await runProjectClient({ name, command: ProjectCommand.重启 })
            toast.success("重启关联项目成功", { id: toastId })
            resetRestartProjectsDialog()
        } catch (error) {
            toast.error(error instanceof Error ? error.message : String(error), { id: toastId })
        } finally {
            setIsRestartProjectsPending(false)
        }
    }

    async function onFileChange({ data: target, file }: UploadDockerImageParams) {
        if (!file.name.toLowerCase().endsWith(".tar")) {
            toast.error("仅支持上传 tar 文件")
            return
        }

        const formData = new FormData()
        formData.set("file", file)
        if (target?.name) formData.set("targetName", target.name)
        const result = await uploadDockerImage(formData)
        if (target && !result.skipFollowUp) onOpenRestartProjectsDialog(target)
    }

    async function onPull(target: DockerImageItem) {
        const result = await pullDockerImage({ name: target.name })
        if (!result.skipFollowUp) onOpenRestartProjectsDialog(target)
    }

    async function onDelete(name: string) {
        await deleteDockerImage({ name })
        setSelectedImageReferences(previous => previous.filter(item => item !== name))
    }

    async function refreshDockerImageQueries() {
        await Promise.all([
            queryClient.invalidateQueries({ queryKey: ["query-docker-image"] }),
            queryClient.invalidateQueries({ queryKey: ["query-docker-image-detail"] }),
            queryClient.invalidateQueries({ queryKey: ["query-docker-container"] }),
        ])
    }

    async function onBatchDelete() {
        if (selectedImageReferences.length === 0) return

        const imageReferences = [...selectedImageReferences]

        const failedItems: BatchDeleteDockerImageErrorItem[] = []

        const toastId = toast.loading(`删除 ${imageReferences.length} 个镜像中...`)
        setIsBatchDeleteConfirmOpen(false)

        try {
            setIsBatchDeletePending(true)

            for (const name of imageReferences) {
                try {
                    await deleteDockerImageClient({ name })
                } catch (error) {
                    failedItems.push({ name, message: error instanceof Error ? error.message : String(error) })
                }
            }

            await refreshDockerImageQueries()

            if (failedItems.length === 0) {
                setSelectedImageReferences([])
                toast.success(`成功删除 ${imageReferences.length} 个镜像`, { id: toastId })
                return
            }

            const successCount = imageReferences.length - failedItems.length
            setSelectedImageReferences(failedItems.map(item => item.name))
            setBatchDeleteErrors(failedItems)

            if (successCount > 0) toast.warning(`成功删除 ${successCount} 个镜像，失败 ${failedItems.length} 个`, { id: toastId })
            else toast.error(`删除失败，共 ${failedItems.length} 个镜像未删除`, { id: toastId })
        } finally {
            setIsBatchDeletePending(false)
        }
    }

    function onOpenBuildStaticDialog(target?: DockerImageItem) {
        setBuildStaticTarget(target)
        setStaticFile(undefined)
        buildStaticForm.reset({ imageName: "", nginxImage: defaultNginxImage ?? "" })
        setIsBuildStaticOpen(true)
    }

    function onOpenBuildJarDialog(target?: DockerImageItem) {
        setBuildJarTarget(target)
        setJarFile(undefined)
        buildJarForm.reset({ imageName: "", javaImage: defaultJavaImage ?? "", startCommand: DEFAULT_JAR_START_COMMAND })
        setIsBuildJarOpen(true)
    }

    function onOpenRenameDialog(target: DockerImageItem) {
        setRenameTarget(target)
        renameForm.reset({ tag: target.tag === "<none>" ? "" : target.tag, targetName: target.isDangling ? "" : target.name })
        setIsRenameOpen(true)
    }

    function onOpenCopyDialog(target: DockerImageItem) {
        setCopyTarget(target)
        copyForm.reset({ tag: target.tag, targetName: "" })
        setIsCopyOpen(true)
    }

    function resetBuildStaticDialog() {
        buildStaticForm.reset({ imageName: "", nginxImage: "" })
        setStaticFile(undefined)
        setBuildStaticTarget(undefined)
        setIsBuildStaticOpen(false)
    }

    function resetBuildJarDialog() {
        buildJarForm.reset({ imageName: "", javaImage: "", startCommand: DEFAULT_JAR_START_COMMAND })
        setJarFile(undefined)
        setBuildJarTarget(undefined)
        setIsBuildJarOpen(false)
    }

    function resetRenameDialog() {
        renameForm.reset({ tag: "", targetName: "" })
        setRenameTarget(undefined)
        setPendingRenameValues(undefined)
        setIsRenameConfirmOpen(false)
        setIsRenameOpen(false)
    }

    function resetCopyDialog() {
        copyForm.reset({ tag: "", targetName: "" })
        setCopyTarget(undefined)
        setIsCopyOpen(false)
    }

    function onStaticFileChange(file: File) {
        if (!/\.(zip|7z)$/iu.test(file.name)) {
            toast.error("仅支持上传 zip 或 7z 文件")
            return
        }

        setStaticFile(file)
    }

    function onJarFileChange(file: File) {
        if (!file.name.toLowerCase().endsWith(".jar")) {
            toast.error("仅支持上传 Jar 文件")
            return
        }

        setJarFile(file)
    }

    async function onBuildStaticFinish(values: StaticDockerImageFormParams) {
        if (!staticFile) return void toast.error("请先选择静态文件")
        if (!values.nginxImage) return void toast.error("请先选择 nginx 镜像")
        if (!buildStaticTarget && !values.imageName.trim()) return void toast.error("请先填写镜像名")
        const formData = new FormData()
        formData.set("file", staticFile)
        formData.set("nginxImage", values.nginxImage)
        if (buildStaticTarget?.name) formData.set("targetName", buildStaticTarget.name)
        if (values.imageName.trim()) formData.set("imageName", values.imageName.trim())
        const target = buildStaticTarget
        const result = await buildStaticDockerImage(formData)
        if (target && !result.skipFollowUp) onOpenRestartProjectsDialog(target)
        resetBuildStaticDialog()
    }

    async function onBuildJarFinish(values: JarDockerImageFormParams) {
        if (!jarFile) return void toast.error("请先选择 Jar 文件")
        if (!values.javaImage) return void toast.error("请先选择 Java 镜像")
        if (!buildJarTarget && !values.imageName.trim()) return void toast.error("请先填写镜像名")
        if (!values.startCommand.trim()) return void toast.error("请先填写启动命令")
        const formData = new FormData()
        formData.set("file", jarFile)
        formData.set("javaImage", values.javaImage)
        if (buildJarTarget?.name) formData.set("targetName", buildJarTarget.name)
        if (values.imageName.trim()) formData.set("imageName", values.imageName.trim())
        formData.set("startCommand", values.startCommand.trim())
        const target = buildJarTarget
        const result = await buildJarDockerImage(formData)
        if (target && !result.skipFollowUp) onOpenRestartProjectsDialog(target)
        resetBuildJarDialog()
    }

    async function onRename(values: ImageTagFormParams) {
        if (!renameTarget) return
        const targetName = renameTarget.isDangling
            ? values.targetName.trim()
            : values.tag.trim()
              ? getDockerImageNameByRepositoryAndTag(renameTarget.repository, values.tag)
              : ""
        if (!targetName) return void toast.error(renameTarget.isDangling ? "请先填写新的镜像名" : "请先填写新的 tag")
        await renameDockerImage({ name: renameTarget.name, targetName })
        resetRenameDialog()
    }

    async function onRenameFinish(values: ImageTagFormParams) {
        if (!renameTarget) return
        if (renameTarget.containerItems.length === 0) return onRename(values)
        setPendingRenameValues(values)
        setIsRenameConfirmOpen(true)
    }

    async function onCopyFinish(values: ImageTagFormParams) {
        if (!copyTarget) return
        const tag = values.tag.trim()
        if (!tag) return void toast.error("请先填写新的 tag")
        await copyDockerImage({ name: copyTarget.name, tag })
        resetCopyDialog()
    }

    const filteredData = useMemo(() => {
        const imageFilterNames = getImageFilterNames(query.name)
        return (data ?? []).filter(item => {
            const isNameMatch = imageFilterNames.length > 0 ? imageFilterNames.includes(item.name) || imageFilterNames.includes(item.reference) : true
            return isNameMatch && (!query.repository || item.repository === query.repository) && (!query.project || item.projects.includes(query.project))
        })
    }, [data, query.name, query.project, query.repository])

    const sortedData = useMemo(() => {
        if (!query.sortBy) return filteredData
        return filteredData
            .slice()
            .sort((first, second) =>
                query.sortBy === "tag"
                    ? compareDockerImage(first, second, query.sortBy, query.sortOrder)
                    : getSortResult(compareDockerImage(first, second, query.sortBy, query.sortOrder), query.sortOrder))
    }, [filteredData, query.sortBy, query.sortOrder])

    const pagedData = useMemo(() => sortedData.slice((pageNum - 1) * pageSize, pageNum * pageSize), [pageNum, pageSize, sortedData])
    const sorting: SortingState = query.sortBy ? [{ id: query.sortBy, desc: query.sortOrder === "desc" }] : []
    const allPageSelected = pagedData.length > 0 && pagedData.every(item => selectedImageReferences.includes(item.reference))

    function togglePageSelection(checked: boolean) {
        const pageReferences = pagedData.map(item => item.reference)
        setSelectedImageReferences(previous =>
            checked ? Array.from(new Set([...previous, ...pageReferences])) : previous.filter(item => !pageReferences.includes(item)))
    }

    const columns: ColumnDef<DockerImageItem>[] = [
        {
            id: "select",
            header: () => (
                <input
                    className="size-4 accent-primary"
                    type="checkbox"
                    aria-label="选择当前页镜像"
                    checked={allPageSelected}
                    disabled={isRequesting || pagedData.length === 0}
                    onChange={event => togglePageSelection(event.target.checked)}
                />
            ),
            size: 48,
            cell: ({ row }) => (
                <input
                    className="size-4 accent-primary"
                    type="checkbox"
                    aria-label={`选择镜像 ${row.original.reference}`}
                    checked={selectedImageReferences.includes(row.original.reference)}
                    disabled={isRequesting}
                    onChange={event =>
                        setSelectedImageReferences(previous =>
                            event.target.checked
                                ? Array.from(new Set([...previous, row.original.reference]))
                                : previous.filter(item => item !== row.original.reference))
                    }
                />
            ),
        },
        {
            accessorKey: "repository",
            header: "镜像名称",
            enableSorting: true,
            size: 220,
            cell: ({ row }) => (row.original.repository === "<none>" ? <Badge variant="outline">&lt;none&gt;</Badge> : row.original.repository || "-"),
        },
        {
            accessorKey: "tag",
            header: "Tag",
            enableSorting: true,
            size: 130,
            cell: ({ row }) => (row.original.tag === "<none>" ? <Badge variant="outline">&lt;none&gt;</Badge> : row.original.tag || "-"),
        },
        { accessorKey: "id", header: "镜像 ID", enableSorting: true, size: 150, cell: ({ row }) => row.original.id?.slice(0, 12) || "-" },
        { accessorKey: "size", header: "大小", enableSorting: true, size: 110, cell: ({ row }) => formatDockerSize(row.original.size) },
        { accessorKey: "createdAt", header: "创建时间", enableSorting: true, size: 180, cell: ({ row }) => formatTime(row.original.createdAt) },
        {
            accessorKey: "projects",
            header: "关联项目",
            enableSorting: true,
            size: 220,
            cell: ({ row }) =>
                row.original.projects.length > 0 ? (
                    <div className="flex flex-wrap justify-center gap-1">
                        {row.original.projects.map(item => (
                            <Link key={item} href={getProjectHref(item)}>
                                <Badge>{getProjectDisplayName(row.original.projectItems, item)}</Badge>
                            </Link>
                        ))}
                    </div>
                ) : (
                    "-"
                ),
        },
        {
            accessorKey: "containerItems",
            header: "关联容器",
            enableSorting: true,
            size: 240,
            cell: ({ row }) => {
                const items = row.original.containerItems
                if (items.length === 0) return "-"
                return (
                    <div className="flex flex-wrap justify-center gap-1">
                        {items.slice(0, 3).map(item => (
                            <Link key={item.id || item.name} href={getContainerHref(item.name)}>
                                <Badge variant="secondary">{item.name || item.id}</Badge>
                            </Link>
                        ))}
                        {items.length > 3 && (
                            <Link href={getContainerListHref(row.original.name)}>
                                <Badge variant="outline">等 {items.length} 个</Badge>
                            </Link>
                        )}
                    </div>
                )
            },
        },
        {
            id: "actions",
            header: "操作",
            size: 280,
            cell: ({ row }) => {
                const record = row.original
                return (
                    <div className="flex items-center justify-center gap-1">
                        {!record.isDangling && (
                            <FilePicker
                                accept=".tar,application/x-tar"
                                disabled={isRequesting}
                                iconOnly
                                title="上传镜像"
                                onValueChange={file => onFileChange({ data: record, file })}
                            />
                        )}
                        {!record.isDangling && (
                            <Button
                                size="icon-xs"
                                variant="ghost"
                                title="上传静态文件制作镜像"
                                disabled={isRequesting}
                                onClick={() => onOpenBuildStaticDialog(record)}
                            >
                                <IconBrandReact />
                            </Button>
                        )}
                        {!record.isDangling && (
                            <Button
                                size="icon-xs"
                                variant="ghost"
                                title="上传 Jar 文件制作镜像"
                                disabled={isRequesting}
                                onClick={() => onOpenBuildJarDialog(record)}
                            >
                                <IconCoffee />
                            </Button>
                        )}
                        {!record.isDangling && (
                            <Button size="icon-xs" variant="ghost" title="拉取镜像" disabled={isRequesting} onClick={() => void onPull(record)}>
                                <DownloadIcon />
                            </Button>
                        )}
                        <Button
                            size="icon-xs"
                            variant="ghost"
                            title={record.isDangling ? "重命名悬空镜像" : "重命名镜像 tag"}
                            disabled={isRequesting}
                            onClick={() => onOpenRenameDialog(record)}
                        >
                            <PencilIcon />
                        </Button>
                        {!record.isDangling && (
                            <Button size="icon-xs" variant="ghost" title="复制镜像 tag" disabled={isRequesting} onClick={() => onOpenCopyDialog(record)}>
                                <CopyIcon />
                            </Button>
                        )}
                        <ConfirmButton
                            className="text-destructive hover:text-destructive"
                            title={`确认删除镜像：${record.reference}`}
                            description="删除后可能影响相关容器。"
                            size="icon-xs"
                            variant="ghost"
                            pending={isDeletePending}
                            disabled={isRequesting}
                            onConfirm={() => onDelete(record.reference)}
                        >
                            <Trash2Icon />
                        </ConfirmButton>
                    </div>
                )
            },
        },
    ]

    function onSortingChange(updater: Updater<SortingState>) {
        const next = (typeof updater === "function" ? updater(sorting) : updater)[0]

        setQuery(previous => ({
            ...previous,
            sortBy: next?.id as DockerImageSortByParams | undefined,
            sortOrder: next ? (next.desc ? "desc" : "asc") : undefined,
            pageNum: 1,
        }))
    }

    function renderSelectField(formField: OptionalStringFormField, options: SelectOption[], placeholder: string) {
        return (
            <Select
                value={formField.state.value ?? allSelectValue}
                onValueChange={value => formField.handleChange(value === allSelectValue ? undefined : value)}
            >
                <SelectTrigger>
                    <SelectValue placeholder={placeholder} />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value={allSelectValue}>全部</SelectItem>
                    {options.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                            {option.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">镜像管理</h1>
                    <p className="mt-1 text-sm text-muted-foreground">管理 Docker 镜像、构建产物及其关联项目和容器。</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <FilePicker accept=".tar,application/x-tar" disabled={isRequesting} title="上传镜像" onValueChange={file => onFileChange({ file })} />
                    <Button variant="outline" disabled={isRequesting} onClick={() => onOpenBuildStaticDialog()}>
                        <IconBrandReact />
                        构建静态镜像
                    </Button>
                    <Button variant="outline" disabled={isRequesting} onClick={() => onOpenBuildJarDialog()}>
                        <IconCoffee />
                        构建 Jar 镜像
                    </Button>
                    <Button variant="outline" disabled={isRequesting} onClick={() => void refetch()}>
                        {isLoading ? <LoaderCircleIcon className="animate-spin" /> : <RefreshCwIcon />}
                        刷新
                    </Button>
                    <Button
                        className="text-destructive hover:text-destructive"
                        variant="outline"
                        disabled={isRequesting || selectedImageReferences.length === 0}
                        onClick={() => setIsBatchDeleteConfirmOpen(true)}
                    >
                        <Trash2Icon />
                        删除所选（{selectedImageReferences.length}）
                    </Button>
                </div>
            </div>
            <Card>
                <CardContent className="pt-6">
                    <form
                        className="flex flex-wrap items-end gap-3"
                        onSubmit={event => {
                            event.preventDefault()
                            event.stopPropagation()
                            void queryForm.handleSubmit()
                        }}
                    >
                        <queryForm.Field name="repository">
                            {field => (
                                <Field className="w-full sm:w-52">
                                    <FieldLabel>镜像名称</FieldLabel>
                                    {renderSelectField(
                                        field,
                                        repositoryOptions.map(value => ({ label: value, value })),
                                        "选择镜像名称",
                                    )}
                                </Field>
                            )}
                        </queryForm.Field>
                        <queryForm.Field name="project">
                            {field => (
                                <Field className="w-full sm:w-52">
                                    <FieldLabel>关联项目</FieldLabel>
                                    {renderSelectField(
                                        field,
                                        projectOptions.map(([value, label]) => ({ label, value })),
                                        "选择关联项目",
                                    )}
                                </Field>
                            )}
                        </queryForm.Field>
                        <Button type="submit" disabled={isRequesting}>
                            查询
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            disabled={isRequesting}
                            onClick={() => {
                                queryForm.reset({ repository: undefined, project: undefined })
                                setQuery(previous => ({ ...previous, repository: undefined, project: undefined, pageNum: 1 }))
                            }}
                        >
                            重置
                        </Button>
                    </form>
                </CardContent>
            </Card>
            <DataTable
                columns={columns}
                columnPinning={{ left: ["select", "repository", "tag"], right: ["actions"] }}
                columnSizingKey="docker-image"
                data={pagedData}
                loading={isLoading || isBatchDeletePending}
                pageNum={pageNum}
                pageSize={pageSize}
                sorting={sorting}
                total={sortedData.length}
                getRowId={row => row.reference}
                onPageChange={(pageNum, pageSize) => setQuery(previous => ({ ...previous, pageNum, pageSize }))}
                onSortingChange={onSortingChange}
            />

            <Dialog
                open={isBuildStaticOpen}
                onOpenChange={open => {
                    if (open) setIsBuildStaticOpen(true)
                    else if (!isBuildStaticPending) resetBuildStaticDialog()
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{buildStaticTarget ? `上传静态文件制作镜像并替换 ${buildStaticTarget.name}` : "上传静态文件制作镜像"}</DialogTitle>
                        <DialogDescription>将 dist 文件夹压缩为 zip 或 7z 后上传，并选择本机 nginx 基础镜像。</DialogDescription>
                    </DialogHeader>
                    <DialogBody>
                        <form className="space-y-4" id="build-static-image-form" onSubmit={event => event.preventDefault()}>
                            {buildStaticTarget && (
                                <Field>
                                    <FieldLabel>当前镜像</FieldLabel>
                                    <Input value={buildStaticTarget.name} readOnly />
                                </Field>
                            )}
                            <Field>
                                <FieldLabel>静态文件</FieldLabel>
                                <div className="flex items-center gap-2">
                                    <FilePicker
                                        accept=".zip,.7z,application/zip,application/x-7z-compressed"
                                        disabled={isBuildStaticPending}
                                        title="选择文件"
                                        onValueChange={onStaticFileChange}
                                    />
                                    <div className="min-w-0 flex-1 truncate text-sm text-muted-foreground">{staticFile?.name ?? "未选择文件"}</div>
                                </div>
                            </Field>
                            <buildStaticForm.Field
                                name="nginxImage"
                                validators={{ onBlur: getOnBlurValidator(dockerImageNameSchema), onSubmit: dockerImageNameSchema }}
                            >
                                {field => {
                                    const invalid = field.state.meta.isTouched && !field.state.meta.isValid
                                    return (
                                        <Field data-invalid={invalid}>
                                            <FieldLabel>nginx 镜像</FieldLabel>
                                            <Select value={field.state.value || undefined} disabled={isBuildStaticPending} onValueChange={field.handleChange}>
                                                <SelectTrigger aria-invalid={invalid} onBlur={field.handleBlur}>
                                                    <SelectValue placeholder="请选择 nginx 镜像" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {nginxImageNames.map(value => (
                                                        <SelectItem key={value} value={value}>
                                                            {value}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FieldDescription>
                                                {nginxImageNames.length === 0
                                                    ? "本机暂无 nginx 镜像，请先拉取 nginx 镜像。"
                                                    : buildStaticTarget
                                                      ? "构建成功后自动替换当前镜像。"
                                                      : "选择用于托管静态资源的基础镜像。"}
                                            </FieldDescription>
                                            {invalid && <FieldError errors={field.state.meta.errors} />}
                                        </Field>
                                    )
                                }}
                            </buildStaticForm.Field>
                            {!buildStaticTarget && (
                                <buildStaticForm.Field
                                    name="imageName"
                                    validators={{ onBlur: getOnBlurValidator(dockerImageNameSchema), onSubmit: dockerImageNameSchema }}
                                >
                                    {field => {
                                        const invalid = field.state.meta.isTouched && !field.state.meta.isValid
                                        return (
                                            <Field data-invalid={invalid}>
                                                <FieldLabel htmlFor="static-image-name">镜像名</FieldLabel>
                                                <Input
                                                    id="static-image-name"
                                                    value={field.state.value}
                                                    placeholder="例如: my-spa:latest"
                                                    aria-invalid={invalid}
                                                    onBlur={field.handleBlur}
                                                    onChange={event => field.handleChange(event.target.value)}
                                                />
                                                {invalid && <FieldError errors={field.state.meta.errors} />}
                                            </Field>
                                        )
                                    }}
                                </buildStaticForm.Field>
                            )}
                        </form>
                    </DialogBody>
                    <DialogFooter>
                        <Button variant="outline" disabled={isBuildStaticPending} onClick={resetBuildStaticDialog}>
                            取消
                        </Button>
                        <Button disabled={isBuildStaticPending || nginxImageNames.length === 0} onClick={() => void buildStaticForm.handleSubmit()}>
                            {isBuildStaticPending && <LoaderCircleIcon className="animate-spin" />}
                            确认
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog
                open={isBuildJarOpen}
                onOpenChange={open => {
                    if (open) setIsBuildJarOpen(true)
                    else if (!isBuildJarPending) resetBuildJarDialog()
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{buildJarTarget ? `上传 Jar 文件制作镜像并替换 ${buildJarTarget.name}` : "上传 Jar 文件制作镜像"}</DialogTitle>
                        <DialogDescription>上传可直接运行的 Jar 文件，并选择包含 Java 运行环境的基础镜像。</DialogDescription>
                    </DialogHeader>
                    <DialogBody>
                        <div className="space-y-4">
                            {buildJarTarget && (
                                <Field>
                                    <FieldLabel>当前镜像</FieldLabel>
                                    <Input value={buildJarTarget.name} readOnly />
                                </Field>
                            )}
                            <Field>
                                <FieldLabel>Jar 文件</FieldLabel>
                                <div className="flex items-center gap-2">
                                    <FilePicker
                                        accept=".jar,application/java-archive,application/x-java-archive"
                                        disabled={isBuildJarPending}
                                        title="选择文件"
                                        onValueChange={onJarFileChange}
                                    />
                                    <div className="min-w-0 flex-1 truncate text-sm text-muted-foreground">{jarFile?.name ?? "未选择文件"}</div>
                                </div>
                            </Field>
                            <buildJarForm.Field
                                name="javaImage"
                                validators={{ onBlur: getOnBlurValidator(dockerImageNameSchema), onSubmit: dockerImageNameSchema }}
                            >
                                {field => {
                                    const invalid = field.state.meta.isTouched && !field.state.meta.isValid
                                    return (
                                        <Field data-invalid={invalid}>
                                            <FieldLabel>Java 镜像</FieldLabel>
                                            <Select value={field.state.value || undefined} disabled={isBuildJarPending} onValueChange={field.handleChange}>
                                                <SelectTrigger aria-invalid={invalid} onBlur={field.handleBlur}>
                                                    <SelectValue placeholder="请选择 Java 镜像" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {imageNames.map(value => (
                                                        <SelectItem key={value} value={value}>
                                                            {value}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FieldDescription>
                                                {imageNames.length === 0
                                                    ? "本机暂无基础镜像。"
                                                    : !defaultJavaImage
                                                      ? "未识别到常见 Java 镜像，请确认所选镜像包含 Java 运行环境。"
                                                      : buildJarTarget
                                                        ? "构建成功后自动替换当前镜像。"
                                                        : "选择 Java 运行环境。"}
                                            </FieldDescription>
                                            {invalid && <FieldError errors={field.state.meta.errors} />}
                                        </Field>
                                    )
                                }}
                            </buildJarForm.Field>
                            {!buildJarTarget && (
                                <buildJarForm.Field
                                    name="imageName"
                                    validators={{ onBlur: getOnBlurValidator(dockerImageNameSchema), onSubmit: dockerImageNameSchema }}
                                >
                                    {field => (
                                        <Field data-invalid={field.state.meta.isTouched && !field.state.meta.isValid}>
                                            <FieldLabel>镜像名</FieldLabel>
                                            <Input
                                                value={field.state.value}
                                                placeholder="例如: my-app:latest"
                                                onBlur={field.handleBlur}
                                                onChange={event => field.handleChange(event.target.value)}
                                            />
                                            <FieldError errors={field.state.meta.errors} />
                                        </Field>
                                    )}
                                </buildJarForm.Field>
                            )}
                            <buildJarForm.Field
                                name="startCommand"
                                validators={{ onBlur: getOnBlurValidator(dockerStartCommandSchema), onSubmit: dockerStartCommandSchema }}
                            >
                                {field => (
                                    <Field data-invalid={field.state.meta.isTouched && !field.state.meta.isValid}>
                                        <FieldLabel>启动命令</FieldLabel>
                                        <Input
                                            value={field.state.value}
                                            placeholder={DEFAULT_JAR_START_COMMAND}
                                            onBlur={field.handleBlur}
                                            onChange={event => field.handleChange(event.target.value)}
                                        />
                                        <FieldError errors={field.state.meta.errors} />
                                    </Field>
                                )}
                            </buildJarForm.Field>
                        </div>
                    </DialogBody>
                    <DialogFooter>
                        <Button variant="outline" disabled={isBuildJarPending} onClick={resetBuildJarDialog}>
                            取消
                        </Button>
                        <Button disabled={isBuildJarPending || imageNames.length === 0} onClick={() => void buildJarForm.handleSubmit()}>
                            {isBuildJarPending && <LoaderCircleIcon className="animate-spin" />}
                            确认
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog
                open={isRenameOpen}
                onOpenChange={open => {
                    if (open) setIsRenameOpen(true)
                    else if (!isRenamePending) resetRenameDialog()
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{renameTarget ? `重命名 ${renameTarget.name}` : "重命名镜像"}</DialogTitle>
                        <DialogDescription>
                            {renameTarget?.isDangling
                                ? "悬空镜像没有可复用的仓库名，请直接输入完整镜像名。"
                                : `仓库名保持为 ${renameTarget?.repository ?? "-"}。`}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogBody>
                        {renameTarget?.isDangling ? (
                            <renameForm.Field
                                name="targetName"
                                validators={{ onBlur: getOnBlurValidator(dockerImageNameSchema), onSubmit: dockerImageNameSchema }}
                            >
                                {field => (
                                    <Field data-invalid={field.state.meta.isTouched && !field.state.meta.isValid}>
                                        <FieldLabel>新镜像名</FieldLabel>
                                        <Input
                                            value={field.state.value}
                                            autoComplete="off"
                                            placeholder="例如：my-app:latest"
                                            onBlur={field.handleBlur}
                                            onChange={event => field.handleChange(event.target.value)}
                                        />
                                        <FieldError errors={field.state.meta.errors} />
                                    </Field>
                                )}
                            </renameForm.Field>
                        ) : (
                            <renameForm.Field name="tag" validators={{ onBlur: getOnBlurValidator(dockerImageTagSchema), onSubmit: dockerImageTagSchema }}>
                                {field => (
                                    <Field data-invalid={field.state.meta.isTouched && !field.state.meta.isValid}>
                                        <FieldLabel>新 tag</FieldLabel>
                                        <Input
                                            value={field.state.value}
                                            autoComplete="off"
                                            placeholder="请输入新的 tag"
                                            onBlur={field.handleBlur}
                                            onChange={event => field.handleChange(event.target.value)}
                                        />
                                        <FieldError errors={field.state.meta.errors} />
                                    </Field>
                                )}
                            </renameForm.Field>
                        )}
                    </DialogBody>
                    <DialogFooter>
                        <Button variant="outline" disabled={isRenamePending} onClick={resetRenameDialog}>
                            取消
                        </Button>
                        <Button disabled={isRenamePending} onClick={() => void renameForm.handleSubmit()}>
                            {isRenamePending && <LoaderCircleIcon className="animate-spin" />}
                            确认
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={isRenameConfirmOpen} onOpenChange={setIsRenameConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>确认重命名镜像</AlertDialogTitle>
                        <AlertDialogDescription>
                            当前镜像已关联容器：{getDockerContainerNamesText(renameTarget?.containerItems ?? [])}
                            。重命名后，相关容器后续重建或重新创建时可能受到影响。
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isRenamePending}>取消</AlertDialogCancel>
                        <AlertDialogAction disabled={isRenamePending} onClick={() => pendingRenameValues && void onRename(pendingRenameValues)}>
                            确认重命名
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Dialog
                open={isCopyOpen}
                onOpenChange={open => {
                    if (open) setIsCopyOpen(true)
                    else if (!isCopyPending) resetCopyDialog()
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{copyTarget ? `复制 ${copyTarget.name}` : "复制镜像"}</DialogTitle>
                        <DialogDescription>仓库名保持为 {copyTarget?.repository ?? "-"}，请输入新的 tag。</DialogDescription>
                    </DialogHeader>
                    <DialogBody>
                        <copyForm.Field name="tag" validators={{ onBlur: getOnBlurValidator(dockerImageTagSchema), onSubmit: dockerImageTagSchema }}>
                            {field => (
                                <Field data-invalid={field.state.meta.isTouched && !field.state.meta.isValid}>
                                    <FieldLabel>新 tag</FieldLabel>
                                    <Input
                                        value={field.state.value}
                                        autoComplete="off"
                                        placeholder="请输入新的 tag"
                                        onBlur={field.handleBlur}
                                        onChange={event => field.handleChange(event.target.value)}
                                    />
                                    <FieldError errors={field.state.meta.errors} />
                                </Field>
                            )}
                        </copyForm.Field>
                    </DialogBody>
                    <DialogFooter>
                        <Button variant="outline" disabled={isCopyPending} onClick={resetCopyDialog}>
                            取消
                        </Button>
                        <Button disabled={isCopyPending} onClick={() => void copyForm.handleSubmit()}>
                            {isCopyPending && <LoaderCircleIcon className="animate-spin" />}
                            确认
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog
                open={isRestartProjectsOpen}
                onOpenChange={open => {
                    if (open) setIsRestartProjectsOpen(true)
                    else if (!isRestartProjectsPending) resetRestartProjectsDialog()
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{restartProjectsState.imageName ? `重启 ${restartProjectsState.imageName} 关联项目` : "重启关联项目"}</DialogTitle>
                        <DialogDescription>选中的项目会依次执行 docker compose down 和 docker compose up -d。</DialogDescription>
                    </DialogHeader>
                    <DialogBody className="space-y-2">
                        {restartProjectsState.projectItems.map(item => (
                            <label key={item.name} className="flex items-center gap-3 rounded-2xl border px-3 py-2 text-sm">
                                <input
                                    className="size-4 accent-primary"
                                    type="checkbox"
                                    checked={selectedRestartProjectNames.includes(item.name)}
                                    disabled={isRestartProjectsPending}
                                    onChange={event =>
                                        setSelectedRestartProjectNames(previous =>
                                            event.target.checked ? Array.from(new Set([...previous, item.name])) : previous.filter(name => name !== item.name))
                                    }
                                />
                                {item.displayName}
                            </label>
                        ))}
                    </DialogBody>
                    <DialogFooter>
                        <Button variant="outline" disabled={isRestartProjectsPending} onClick={resetRestartProjectsDialog}>
                            取消
                        </Button>
                        <Button disabled={isRestartProjectsPending || selectedRestartProjectNames.length === 0} onClick={() => void onRestartProjects()}>
                            {isRestartProjectsPending && <LoaderCircleIcon className="animate-spin" />}
                            确认
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={isBatchDeleteConfirmOpen} onOpenChange={setIsBatchDeleteConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>以下 {selectedImageReferences.length} 个镜像将被删除</AlertDialogTitle>
                        <AlertDialogDescription>删除后可能影响相关容器。</AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="max-h-60 space-y-2 overflow-y-auto rounded-2xl border bg-muted/30 p-3 text-sm">
                        {selectedImageReferences.map(item => (
                            <div key={item} className="break-all">
                                {item}
                            </div>
                        ))}
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isBatchDeletePending}>取消</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            disabled={isBatchDeletePending}
                            onClick={() => void onBatchDelete()}
                        >
                            确认删除
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Dialog open={batchDeleteErrors.length > 0} onOpenChange={open => !open && setBatchDeleteErrors([])}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>镜像删除失败</DialogTitle>
                        <DialogDescription>以下镜像未能删除，请根据错误信息处理后重试。</DialogDescription>
                    </DialogHeader>
                    <DialogBody className="space-y-2">
                        {batchDeleteErrors.map(item => (
                            <div key={item.name} className="rounded-2xl border bg-muted/30 px-3 py-2 text-sm">
                                <div className="break-all font-medium">{item.name}</div>
                                <div className="mt-1 text-muted-foreground">{item.message}</div>
                            </div>
                        ))}
                    </DialogBody>
                    <DialogFooter>
                        <Button onClick={() => setBatchDeleteErrors([])}>知道了</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

export default Page
