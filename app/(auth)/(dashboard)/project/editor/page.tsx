"use client"

import { type FC, type KeyboardEvent, useEffect, useId, useMemo, useState } from "react"

import Editor, { loader } from "@monaco-editor/react"
import { useForm } from "@tanstack/react-form"
import { isNonNullable } from "deepsea-tools"
import { ArrowLeftIcon, FileCode2Icon, LoaderCircleIcon, PlusIcon, SaveIcon, Trash2Icon } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { z } from "zod/v4"

import cobalt2Theme from "@/assets/monaco-themes/Cobalt2.json"
import draculaTheme from "@/assets/monaco-themes/Dracula.json"
import githubDarkTheme from "@/assets/monaco-themes/GitHub Dark.json"
import githubLightTheme from "@/assets/monaco-themes/GitHub Light.json"
import monokaiTheme from "@/assets/monaco-themes/Monokai.json"
import nightOwlTheme from "@/assets/monaco-themes/Night Owl.json"
import nordTheme from "@/assets/monaco-themes/Nord.json"
import oceanicNextTheme from "@/assets/monaco-themes/Oceanic Next.json"
import solarizedDarkTheme from "@/assets/monaco-themes/Solarized-dark.json"
import solarizedLightTheme from "@/assets/monaco-themes/Solarized-light.json"
import tomorrowNightEightiesTheme from "@/assets/monaco-themes/Tomorrow-Night-Eighties.json"
import tomorrowNightTheme from "@/assets/monaco-themes/Tomorrow-Night.json"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

import { useAddProject } from "@/hooks/useAddProject"
import { useGetProject } from "@/hooks/useGetProject"
import { useQueryDockerImage } from "@/hooks/useQueryDockerImage"
import { useUpdateProject } from "@/hooks/useUpdateProject"

import { projectNameSchema } from "@/schemas/projectName"

import {
    type ComposeFile,
    type ProjectFormData,
    type ProjectFormDependsOnItem,
    type ProjectFormKeyValue,
    type ProjectFormService,
    ComposeRestartPolicy,
    composeToFormData,
    defaultComposeContent,
    formDataToCompose,
    formDataToYaml,
    parseComposeYaml,
    ProjectFormCommandMode,
} from "@/utils/compose"
import { getOnBlurValidator } from "@/utils/getOnBlurValidator"
import { toast } from "@/utils/toast"

let isMonacoConfigured = false
let monacoConfigurePromise: Promise<void> | undefined

export interface MonacoEnvironment {
    getWorker: (moduleId: string, label: string) => Worker
}

export interface MonacoGlobal {
    MonacoEnvironment?: MonacoEnvironment
}

export interface MonacoEditorController {
    defineTheme: (name: string, theme: unknown) => void
    setTheme: (name: string) => void
}

export interface MonacoInstance {
    editor: MonacoEditorController
}

export interface MonacoThemeOption {
    name: string
    label: string
    value: string
}

export interface MonacoThemeMap {
    [key: string]: unknown
}

export interface NormalizeProjectSaveValuesParams {
    values: ProjectFormData
    otherValues?: ProjectFormData
}

export interface SyncAndSaveProjectParams extends NormalizeProjectSaveValuesParams {
    original?: ComposeFile
}

interface StringListEditorProps {
    value?: string[]
    suggestions?: string[]
    placeholder: string
    disabled?: boolean
    onValueChange: (value: string[]) => void
}

interface SelectOption {
    label: string
    value: string
}

interface OptionSelectProps {
    value?: string
    options: SelectOption[]
    placeholder: string
    disabled?: boolean
    allowUnset?: boolean
    onValueChange: (value?: string) => void
}

interface BooleanSelectProps {
    value?: boolean
    placeholder: string
    disabled?: boolean
    onValueChange: (value?: boolean) => void
}

async function ensureMonacoConfigured() {
    if (typeof window === "undefined" || isMonacoConfigured) return
    if (monacoConfigurePromise) return monacoConfigurePromise

    monacoConfigurePromise = (async function configureMonaco() {
        const monaco = await import("monaco-editor")

        // @ts-expect-error: monaco-editor ESM internals don't have type declarations
        await import("monaco-editor/esm/vs/basic-languages/yaml/yaml.contribution")

        const globalAny = globalThis as MonacoGlobal
        globalAny.MonacoEnvironment = {
            getWorker(_moduleId, _label) {
                return new Worker(new URL("monaco-editor/esm/vs/editor/editor.worker.js", import.meta.url), { type: "module" })
            },
        }

        loader.config({ monaco })
        await loader.init()
        isMonacoConfigured = true
    })()

    try {
        await monacoConfigurePromise
    } catch (error) {
        monacoConfigurePromise = undefined
        throw error
    }
}

const monacoThemeOptions: MonacoThemeOption[] = [
    { name: "Night Owl", label: "Night Owl", value: "night-owl" },
    { name: "Oceanic Next", label: "Oceanic Next", value: "oceanic-next" },
    { name: "Dracula", label: "Dracula", value: "dracula" },
    { name: "Nord", label: "Nord", value: "nord" },
    { name: "Monokai", label: "Monokai", value: "monokai" },
    { name: "GitHub Dark", label: "GitHub Dark", value: "github-dark" },
    { name: "GitHub Light", label: "GitHub Light", value: "github-light" },
    { name: "Tomorrow-Night", label: "Tomorrow Night", value: "tomorrow-night" },
    { name: "Tomorrow-Night-Eighties", label: "Tomorrow Night Eighties", value: "tomorrow-night-eighties" },
    { name: "Solarized-dark", label: "Solarized Dark", value: "solarized-dark" },
    { name: "Solarized-light", label: "Solarized Light", value: "solarized-light" },
    { name: "Cobalt2", label: "Cobalt2", value: "cobalt2" },
]

const monacoThemeMap: MonacoThemeMap = {
    "night-owl": nightOwlTheme,
    "oceanic-next": oceanicNextTheme,
    dracula: draculaTheme,
    nord: nordTheme,
    monokai: monokaiTheme,
    "github-dark": githubDarkTheme,
    "github-light": githubLightTheme,
    "tomorrow-night": tomorrowNightTheme,
    "tomorrow-night-eighties": tomorrowNightEightiesTheme,
    "solarized-dark": solarizedDarkTheme,
    "solarized-light": solarizedLightTheme,
    cobalt2: cobalt2Theme,
}

const projectDisplayNameSchema = z.string({ error: "无效的项目名称" }).trim().min(1, { error: "请输入项目名称" })
const projectNameFormSchema = projectNameSchema.optional()
const projectDisplayNameFormSchema = projectDisplayNameSchema.optional()

const StringListEditor: FC<StringListEditorProps> = ({ value = [], suggestions = [], placeholder, disabled, onValueChange }) => {
    const listId = useId()
    const [inputValue, setInputValue] = useState("")

    function addValue() {
        const next = inputValue.trim()
        if (!next || value.includes(next)) return
        onValueChange([...value, next])
        setInputValue("")
    }

    function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
        if (event.key !== "Enter" && event.key !== ",") return
        event.preventDefault()
        addValue()
    }

    return (
        <div className="space-y-2">
            {value.length > 0 && (
                <div className="flex flex-wrap gap-1">
                    {value.map((item, index) => (
                        <Badge key={`${item}-${index}`} className="gap-1" variant="secondary">
                            <span className="max-w-72 truncate">{item}</span>
                            <button
                                type="button"
                                className="rounded-full text-muted-foreground hover:text-foreground"
                                aria-label={`移除 ${item}`}
                                disabled={disabled}
                                onClick={() => onValueChange(value.filter((_, currentIndex) => currentIndex !== index))}
                            >
                                ×
                            </button>
                        </Badge>
                    ))}
                </div>
            )}
            <div className="flex gap-2">
                <Input
                    className="min-w-0 flex-auto"
                    value={inputValue}
                    list={suggestions.length > 0 ? listId : undefined}
                    placeholder={placeholder}
                    disabled={disabled}
                    onKeyDown={onKeyDown}
                    onChange={event => setInputValue(event.target.value)}
                />
                <Button type="button" variant="outline" disabled={disabled || !inputValue.trim()} onClick={addValue}>
                    添加
                </Button>
            </div>
            {suggestions.length > 0 && (
                <datalist id={listId}>
                    {suggestions.map(item => (
                        <option key={item} value={item} />
                    ))}
                </datalist>
            )}
        </div>
    )
}

const OptionSelect: FC<OptionSelectProps> = ({ value, options, placeholder, disabled, allowUnset, onValueChange }) => (
    <Select
        value={value ?? (allowUnset ? "__unset" : undefined)}
        disabled={disabled}
        onValueChange={nextValue => onValueChange(nextValue === "__unset" ? undefined : nextValue)}
    >
        <SelectTrigger>
            <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
            {allowUnset && <SelectItem value="__unset">未设置</SelectItem>}
            {options.map(option => (
                <SelectItem key={option.value} value={option.value}>
                    {option.label}
                </SelectItem>
            ))}
        </SelectContent>
    </Select>
)

const BooleanSelect: FC<BooleanSelectProps> = ({ value, placeholder, disabled, onValueChange }) => (
    <OptionSelect
        value={value === undefined ? undefined : value ? "true" : "false"}
        options={[
            { label: "是", value: "true" },
            { label: "否", value: "false" },
        ]}
        placeholder={placeholder}
        disabled={disabled}
        allowUnset
        onValueChange={nextValue => onValueChange(nextValue === undefined ? undefined : nextValue === "true")}
    />
)

function getServiceNames(services?: ProjectFormData["services"]) {
    return (services ?? [])
        .map(item => item?.name?.trim())
        .filter(isNonNullable)
        .filter(Boolean)
}

function getComposeFormData(compose: ComposeFile, name?: string) {
    const values = composeToFormData(compose)
    return name ? ({ ...values, name } as ProjectFormData) : values
}

function getCleanValue(value?: string) {
    const nextValue = value?.trim()
    return nextValue || undefined
}

function normalizeProjectSaveValues({ values, otherValues }: NormalizeProjectSaveValuesParams) {
    const name =
        getCleanValue(values.name) ?? getCleanValue(otherValues?.name) ?? getServiceNames(values.services).at(0) ?? getServiceNames(otherValues?.services).at(0)
    const xName = getCleanValue(values.xName) ?? getCleanValue(otherValues?.xName) ?? name
    return { ...values, name, xName } as ProjectFormData
}

function getRestartOptions() {
    return Object.entries(ComposeRestartPolicy).map(([label, value]) => ({ label, value }))
}

function getCommandModeOptions() {
    return Object.entries(ProjectFormCommandMode).map(([label, value]) => ({ label, value }))
}

const dependsOnConditionOptions = [
    { label: "服务启动后", value: "service_started" },
    { label: "服务健康后", value: "service_healthy" },
    { label: "服务成功完成后", value: "service_completed_successfully" },
]

const Page: FC = () => {
    const router = useRouter()
    const searchParams = useSearchParams()
    const searchName = searchParams.get("name") ?? undefined
    const searchCopyFrom = searchParams.get("copyFrom") ?? undefined
    const isCopy = isNonNullable(searchCopyFrom)
    const isUpdate = isNonNullable(searchName) && !isCopy
    const pageTitle = isUpdate ? "编辑项目" : isCopy ? "复制项目" : "新增项目"

    const [yamlValue, setYamlValue] = useState(defaultComposeContent)
    const [composeData, setComposeData] = useState<ComposeFile>()
    const [editorTheme, setEditorTheme] = useState(monacoThemeOptions[0]?.value ?? "night-owl")
    const [editorFontSize, setEditorFontSize] = useState(16)
    const [isEditorReady, setIsEditorReady] = useState(false)
    const [monacoInstance, setMonacoInstance] = useState<unknown>()

    const getProjectParams = isUpdate ? { name: searchName! } : isCopy ? { name: searchCopyFrom! } : undefined
    const isGetProjectEnabled = isUpdate || isCopy
    const { data, isLoading } = useGetProject(getProjectParams, { enabled: isGetProjectEnabled })
    const projectData = isGetProjectEnabled ? data : undefined
    const { data: imageData } = useQueryDockerImage()

    const { mutateAsync: addProject, isPending: isAddPending } = useAddProject({
        onSuccess(result) {
            router.replace(`/project/editor?name=${encodeURIComponent(result.name)}`)
        },
    })

    const { mutateAsync: updateProject, isPending: isUpdatePending } = useUpdateProject()
    const isRequesting = isLoading || isAddPending || isUpdatePending

    const form = useForm({
        defaultValues: {} as ProjectFormData,
        onSubmit: () => onSaveForm(),
    })

    const imageOptions = useMemo(() => (imageData ?? []).map(item => item.name), [imageData])
    const restartOptions = useMemo(() => getRestartOptions(), [])
    const commandModeOptions = useMemo(() => getCommandModeOptions(), [])

    useEffect(() => {
        let isMounted = true
        void ensureMonacoConfigured()
            .then(() => {
                if (isMounted) setIsEditorReady(true)
            })
            .catch(() => {
                if (isMounted) toast.error("YAML 编辑器初始化失败")
            })
        return () => void (isMounted = false)
    }, [])

    useEffect(() => {
        const content = projectData?.content ?? defaultComposeContent
        const formName = isUpdate ? (projectData?.name ?? searchName) : undefined
        setYamlValue(content)

        try {
            const compose = parseComposeYaml(content)
            setComposeData(compose)
            form.reset(getComposeFormData(compose, formName), { keepDefaultValues: true })
        } catch {
            setComposeData(undefined)
            form.reset({ name: formName }, { keepDefaultValues: true })
        }
    }, [form, isUpdate, projectData, searchName])

    useEffect(() => {
        if (!monacoInstance) return
        const theme = monacoThemeMap[editorTheme]
        if (!theme) return
        const editorApi = monacoInstance as MonacoInstance
        editorApi.editor.defineTheme(editorTheme, theme)
        editorApi.editor.setTheme(editorTheme)
    }, [editorTheme, monacoInstance])

    function updateServices(updater: (services: ProjectFormService[]) => ProjectFormService[]) {
        form.setFieldValue("services", updater(form.state.values.services ?? []))
    }

    function updateService(index: number, updater: (service: ProjectFormService) => ProjectFormService) {
        updateServices(services => services.map((service, currentIndex) => (currentIndex === index ? updater(service) : service)))
    }

    function updateDependsOn(index: number, updater: (items: ProjectFormDependsOnItem[]) => ProjectFormDependsOnItem[]) {
        updateService(index, service => ({ ...service, dependsOnItems: updater(service.dependsOnItems ?? []) }))
    }

    function updateEnvironment(index: number, updater: (items: ProjectFormKeyValue[]) => ProjectFormKeyValue[]) {
        updateService(index, service => ({ ...service, environment: updater(service.environment ?? []) }))
    }

    function validateProjectValues(values: ProjectFormData) {
        const nameResult = projectNameSchema.safeParse(values.name)

        if (!nameResult.success) {
            toast.error(nameResult.error.issues[0]?.message ?? "无效的英文名称")
            return false
        }

        const xNameResult = projectDisplayNameSchema.safeParse(values.xName)

        if (!xNameResult.success) {
            toast.error(xNameResult.error.issues[0]?.message ?? "请输入项目名称")
            return false
        }

        const invalidServiceIndex = (values.services ?? []).findIndex(service => !service.name?.trim())

        if (invalidServiceIndex >= 0) {
            toast.error(`第 ${invalidServiceIndex + 1} 个服务缺少服务名称`)
            return false
        }

        return true
    }

    function getCurrentYamlFormData() {
        try {
            const compose = parseComposeYaml(yamlValue)
            return { compose, values: composeToFormData(compose) }
        } catch {
            return undefined
        }
    }

    async function syncAndSaveProject({ values, otherValues, original }: SyncAndSaveProjectParams) {
        const nextValues = normalizeProjectSaveValues({ values, otherValues })
        if (!validateProjectValues(nextValues)) return
        const content = formDataToYaml(nextValues, original)
        const nextCompose = formDataToCompose(nextValues, original)
        form.reset(nextValues, { keepDefaultValues: true })
        setComposeData(nextCompose)
        setYamlValue(content)
        const projectName = isUpdate ? searchName : nextValues.name
        if (!projectName) return

        if (isUpdate) await updateProject({ name: projectName, content })
        else await addProject({ name: projectName, content })
    }

    function onSyncYamlToForm() {
        try {
            const compose = parseComposeYaml(yamlValue)
            setComposeData(compose)
            form.reset(getComposeFormData(compose, isUpdate ? searchName : undefined), { keepDefaultValues: true })
            toast.success("YAML 已同步到表单")
        } catch {
            toast.error("YAML 解析失败，请检查内容")
        }
    }

    function onSyncFormToYaml() {
        const values = form.state.values
        if (!validateProjectValues(values)) return
        const content = formDataToYaml(values, composeData)
        setComposeData(formDataToCompose(values, composeData))
        setYamlValue(content)
        toast.success("表单已同步到 YAML")
    }

    async function onSaveForm() {
        const yamlData = getCurrentYamlFormData()
        await syncAndSaveProject({ values: form.state.values, otherValues: yamlData?.values, original: yamlData?.compose ?? composeData })
    }

    async function onSaveYaml() {
        let compose: ComposeFile

        try {
            compose = parseComposeYaml(yamlValue)
        } catch {
            toast.error("YAML 解析失败，请检查内容")
            return
        }

        await syncAndSaveProject({ values: composeToFormData(compose), otherValues: form.state.values, original: compose })
    }

    return (
        <div className="flex h-[calc(100vh-3rem)] min-h-[40rem] flex-col gap-4 supports-[height:100dvh]:h-[calc(100dvh-3rem)]">
            <title>{`${pageTitle} · docker`}</title>
            <div className="flex flex-none flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">{pageTitle}</h1>
                    <p className="mt-1 text-sm text-muted-foreground">在结构化表单与原始 Compose YAML 之间双向同步。</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" disabled={isRequesting} onClick={onSyncYamlToForm}>
                        <FileCode2Icon />从 YAML 同步
                    </Button>
                    <Button variant="outline" disabled={isRequesting} onClick={onSyncFormToYaml}>
                        <FileCode2Icon />
                        同步到 YAML
                    </Button>
                    <Button disabled={isRequesting} onClick={() => void form.handleSubmit()}>
                        {isRequesting ? <LoaderCircleIcon className="animate-spin" /> : <SaveIcon />}
                        保存表单
                    </Button>
                    <Button disabled={isRequesting} onClick={() => void onSaveYaml()}>
                        {isRequesting ? <LoaderCircleIcon className="animate-spin" /> : <SaveIcon />}
                        保存 YAML
                    </Button>
                    <Button variant="ghost" disabled={isRequesting} onClick={() => router.push("/project")}>
                        <ArrowLeftIcon />
                        返回
                    </Button>
                </div>
            </div>
            <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl border bg-card">
                    <div className="flex h-12 flex-none items-center border-b px-4 font-medium">表单编辑</div>
                    <div className="min-h-0 flex-1 overflow-y-auto p-4" style={{ scrollbarGutter: "stable" }}>
                        <div className="space-y-5">
                            <form.Field name="name" validators={{ onBlur: getOnBlurValidator(projectNameFormSchema), onSubmit: projectNameFormSchema }}>
                                {field => {
                                    const invalid = field.state.meta.isTouched && !field.state.meta.isValid
                                    return (
                                        <Field data-invalid={invalid}>
                                            <FieldLabel htmlFor="project-name">英文名称</FieldLabel>
                                            <Input
                                                id="project-name"
                                                value={field.state.value ?? ""}
                                                disabled={isRequesting || isUpdate}
                                                placeholder="仅支持字母、数字、下划线和短横线"
                                                aria-invalid={invalid}
                                                onBlur={field.handleBlur}
                                                onChange={event => field.handleChange(event.target.value)}
                                            />
                                            {invalid && <FieldError errors={field.state.meta.errors} />}
                                        </Field>
                                    )
                                }}
                            </form.Field>
                            <form.Field
                                name="xName"
                                validators={{ onBlur: getOnBlurValidator(projectDisplayNameFormSchema), onSubmit: projectDisplayNameFormSchema }}
                            >
                                {field => {
                                    const invalid = field.state.meta.isTouched && !field.state.meta.isValid
                                    return (
                                        <Field data-invalid={invalid}>
                                            <FieldLabel htmlFor="project-x-name">项目名称</FieldLabel>
                                            <Input
                                                id="project-x-name"
                                                value={field.state.value ?? ""}
                                                disabled={isRequesting}
                                                placeholder="对应 YAML 中的 x-name 字段"
                                                aria-invalid={invalid}
                                                onBlur={field.handleBlur}
                                                onChange={event => field.handleChange(event.target.value)}
                                            />
                                            {invalid && <FieldError errors={field.state.meta.errors} />}
                                        </Field>
                                    )
                                }}
                            </form.Field>
                            <form.Field name="description">
                                {field => (
                                    <Field>
                                        <FieldLabel htmlFor="project-description">项目描述</FieldLabel>
                                        <Textarea
                                            id="project-description"
                                            value={field.state.value ?? ""}
                                            disabled={isRequesting}
                                            onChange={event => field.handleChange(event.target.value)}
                                        />
                                    </Field>
                                )}
                            </form.Field>
                            <div className="grid grid-cols-1 gap-4 rounded-2xl border bg-muted/20 p-4">
                                <form.Field name="networks">
                                    {field => (
                                        <Field>
                                            <FieldLabel>网络</FieldLabel>
                                            <StringListEditor
                                                value={field.state.value}
                                                placeholder="输入并回车创建网络"
                                                disabled={isRequesting}
                                                onValueChange={field.handleChange}
                                            />
                                        </Field>
                                    )}
                                </form.Field>
                                <form.Field name="volumes">
                                    {field => (
                                        <Field>
                                            <FieldLabel>数据卷</FieldLabel>
                                            <StringListEditor
                                                value={field.state.value}
                                                placeholder="输入并回车创建数据卷"
                                                disabled={isRequesting}
                                                onValueChange={field.handleChange}
                                            />
                                        </Field>
                                    )}
                                </form.Field>
                            </div>
                            <form.Subscribe selector={state => state.values}>
                                {values => {
                                    const services = values.services ?? []
                                    const serviceNames = getServiceNames(services)
                                    const networks = values.networks ?? []

                                    return (
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between gap-3">
                                                <div>
                                                    <div className="font-medium">服务配置</div>
                                                    <div className="text-sm text-muted-foreground">配置镜像、命令、网络、挂载卷和依赖关系。</div>
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    disabled={isRequesting}
                                                    onClick={() =>
                                                        updateServices(items => [
                                                            ...items,
                                                            {
                                                                commandMode: ProjectFormCommandMode.字符串,
                                                                entrypointMode: ProjectFormCommandMode.字符串,
                                                            },
                                                        ])
                                                    }
                                                >
                                                    <PlusIcon />
                                                    新增服务
                                                </Button>
                                            </div>
                                            {services.map((service, serviceIndex) => (
                                                <div key={serviceIndex} className="space-y-5 rounded-2xl border p-4">
                                                    <div className="flex items-center justify-between gap-3">
                                                        <div className="flex min-w-0 items-center gap-2">
                                                            <span className="font-medium">服务 {serviceIndex + 1}</span>
                                                            {service.name && <Badge className="max-w-60 truncate">{service.name}</Badge>}
                                                        </div>
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="ghost"
                                                            disabled={isRequesting}
                                                            onClick={() => updateServices(items => items.filter((_, index) => index !== serviceIndex))}
                                                        >
                                                            <Trash2Icon />
                                                            删除服务
                                                        </Button>
                                                    </div>
                                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                                        <Field>
                                                            <FieldLabel>服务名称</FieldLabel>
                                                            <Input
                                                                value={service.name ?? ""}
                                                                disabled={isRequesting}
                                                                placeholder="例如: web"
                                                                onChange={event =>
                                                                    updateService(serviceIndex, current => ({ ...current, name: event.target.value }))
                                                                }
                                                            />
                                                        </Field>
                                                        <Field>
                                                            <FieldLabel>镜像</FieldLabel>
                                                            <Input
                                                                value={service.image ?? ""}
                                                                list="docker-image-options"
                                                                disabled={isRequesting}
                                                                placeholder="例如: nginx:latest"
                                                                onChange={event =>
                                                                    updateService(serviceIndex, current => ({ ...current, image: event.target.value }))
                                                                }
                                                            />
                                                        </Field>
                                                        <Field>
                                                            <FieldLabel>容器名称</FieldLabel>
                                                            <Input
                                                                value={service.containerName ?? ""}
                                                                disabled={isRequesting}
                                                                placeholder="例如: web-app"
                                                                onChange={event =>
                                                                    updateService(serviceIndex, current => ({ ...current, containerName: event.target.value }))
                                                                }
                                                            />
                                                        </Field>
                                                        <Field>
                                                            <FieldLabel>重启策略</FieldLabel>
                                                            <OptionSelect
                                                                value={service.restart}
                                                                options={restartOptions}
                                                                placeholder="选择重启策略"
                                                                disabled={isRequesting}
                                                                allowUnset
                                                                onValueChange={value =>
                                                                    updateService(serviceIndex, current => ({
                                                                        ...current,
                                                                        restart: value as ComposeRestartPolicy | undefined,
                                                                    }))
                                                                }
                                                            />
                                                        </Field>
                                                        <Field>
                                                            <FieldLabel>入口点类型</FieldLabel>
                                                            <OptionSelect
                                                                value={service.entrypointMode ?? ProjectFormCommandMode.字符串}
                                                                options={commandModeOptions}
                                                                placeholder="选择入口点类型"
                                                                disabled={isRequesting}
                                                                onValueChange={value =>
                                                                    updateService(serviceIndex, current => ({
                                                                        ...current,
                                                                        entrypointMode: value as ProjectFormCommandMode,
                                                                    }))
                                                                }
                                                            />
                                                        </Field>
                                                        <Field>
                                                            <FieldLabel>启动命令类型</FieldLabel>
                                                            <OptionSelect
                                                                value={service.commandMode ?? ProjectFormCommandMode.字符串}
                                                                options={commandModeOptions}
                                                                placeholder="选择启动命令类型"
                                                                disabled={isRequesting}
                                                                onValueChange={value =>
                                                                    updateService(serviceIndex, current => ({
                                                                        ...current,
                                                                        commandMode: value as ProjectFormCommandMode,
                                                                    }))
                                                                }
                                                            />
                                                        </Field>
                                                    </div>
                                                    <Field>
                                                        <FieldLabel>服务网络</FieldLabel>
                                                        <StringListEditor
                                                            value={service.networks}
                                                            suggestions={networks}
                                                            placeholder="输入并回车创建服务网络"
                                                            disabled={isRequesting}
                                                            onValueChange={value => updateService(serviceIndex, current => ({ ...current, networks: value }))}
                                                        />
                                                    </Field>
                                                    {service.entrypointMode === ProjectFormCommandMode.数组 ? (
                                                        <Field>
                                                            <FieldLabel>入口点</FieldLabel>
                                                            <StringListEditor
                                                                value={service.entrypointItems}
                                                                placeholder="例如: sh"
                                                                disabled={isRequesting}
                                                                onValueChange={value =>
                                                                    updateService(serviceIndex, current => ({ ...current, entrypointItems: value }))
                                                                }
                                                            />
                                                        </Field>
                                                    ) : (
                                                        <Field>
                                                            <FieldLabel>入口点</FieldLabel>
                                                            <Input
                                                                value={service.entrypoint ?? ""}
                                                                disabled={isRequesting}
                                                                placeholder="例如: sh -c"
                                                                onChange={event =>
                                                                    updateService(serviceIndex, current => ({ ...current, entrypoint: event.target.value }))
                                                                }
                                                            />
                                                        </Field>
                                                    )}
                                                    {service.commandMode === ProjectFormCommandMode.数组 ? (
                                                        <Field>
                                                            <FieldLabel>启动命令</FieldLabel>
                                                            <StringListEditor
                                                                value={service.commandItems}
                                                                placeholder="例如: npm"
                                                                disabled={isRequesting}
                                                                onValueChange={value =>
                                                                    updateService(serviceIndex, current => ({ ...current, commandItems: value }))
                                                                }
                                                            />
                                                        </Field>
                                                    ) : (
                                                        <Field>
                                                            <FieldLabel>启动命令</FieldLabel>
                                                            <Input
                                                                value={service.command ?? ""}
                                                                disabled={isRequesting}
                                                                placeholder="例如: npm run start"
                                                                onChange={event =>
                                                                    updateService(serviceIndex, current => ({ ...current, command: event.target.value }))
                                                                }
                                                            />
                                                        </Field>
                                                    )}
                                                    <Field>
                                                        <div className="flex items-center justify-between gap-3">
                                                            <FieldLabel>依赖服务</FieldLabel>
                                                            <Button
                                                                type="button"
                                                                size="sm"
                                                                variant="outline"
                                                                disabled={isRequesting}
                                                                onClick={() => updateDependsOn(serviceIndex, items => [...items, {}])}
                                                            >
                                                                <PlusIcon />
                                                                新增依赖
                                                            </Button>
                                                        </div>
                                                        <div className="space-y-2">
                                                            {(service.dependsOnItems ?? []).map((item, dependsOnIndex) => (
                                                                <div
                                                                    key={dependsOnIndex}
                                                                    className="grid grid-cols-1 gap-2 rounded-2xl border bg-muted/20 p-3 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]"
                                                                >
                                                                    <OptionSelect
                                                                        value={item.serviceName}
                                                                        options={serviceNames
                                                                            .filter(name => name !== service.name)
                                                                            .map(value => ({ label: value, value }))}
                                                                        placeholder="选择依赖服务"
                                                                        disabled={isRequesting}
                                                                        allowUnset
                                                                        onValueChange={value =>
                                                                            updateDependsOn(serviceIndex, items =>
                                                                                items.map((current, index) =>
                                                                                    index === dependsOnIndex ? { ...current, serviceName: value } : current))
                                                                        }
                                                                    />
                                                                    <OptionSelect
                                                                        value={item.condition}
                                                                        options={dependsOnConditionOptions}
                                                                        placeholder="依赖条件"
                                                                        disabled={isRequesting}
                                                                        allowUnset
                                                                        onValueChange={value =>
                                                                            updateDependsOn(serviceIndex, items =>
                                                                                items.map((current, index) =>
                                                                                    index === dependsOnIndex ? { ...current, condition: value } : current))
                                                                        }
                                                                    />
                                                                    <BooleanSelect
                                                                        value={item.restart}
                                                                        placeholder="变更时重启"
                                                                        disabled={isRequesting}
                                                                        onValueChange={value =>
                                                                            updateDependsOn(serviceIndex, items =>
                                                                                items.map((current, index) =>
                                                                                    index === dependsOnIndex ? { ...current, restart: value } : current))
                                                                        }
                                                                    />
                                                                    <BooleanSelect
                                                                        value={item.required}
                                                                        placeholder="是否必需"
                                                                        disabled={isRequesting}
                                                                        onValueChange={value =>
                                                                            updateDependsOn(serviceIndex, items =>
                                                                                items.map((current, index) =>
                                                                                    index === dependsOnIndex ? { ...current, required: value } : current))
                                                                        }
                                                                    />
                                                                    <Button
                                                                        type="button"
                                                                        size="icon"
                                                                        variant="ghost"
                                                                        title="移除依赖"
                                                                        disabled={isRequesting}
                                                                        onClick={() =>
                                                                            updateDependsOn(serviceIndex, items =>
                                                                                items.filter((_, index) => index !== dependsOnIndex))
                                                                        }
                                                                    >
                                                                        <Trash2Icon />
                                                                    </Button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </Field>
                                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                                        <Field>
                                                            <FieldLabel>端口映射</FieldLabel>
                                                            <StringListEditor
                                                                value={service.ports}
                                                                placeholder="例如: 8080:80"
                                                                disabled={isRequesting}
                                                                onValueChange={value => updateService(serviceIndex, current => ({ ...current, ports: value }))}
                                                            />
                                                        </Field>
                                                        <Field>
                                                            <FieldLabel>挂载卷</FieldLabel>
                                                            <StringListEditor
                                                                value={service.volumes}
                                                                placeholder="例如: ./data:/app/data"
                                                                disabled={isRequesting}
                                                                onValueChange={value =>
                                                                    updateService(serviceIndex, current => ({ ...current, volumes: value }))
                                                                }
                                                            />
                                                        </Field>
                                                    </div>
                                                    <Field>
                                                        <div className="flex items-center justify-between gap-3">
                                                            <FieldLabel>环境变量</FieldLabel>
                                                            <Button
                                                                type="button"
                                                                size="sm"
                                                                variant="outline"
                                                                disabled={isRequesting}
                                                                onClick={() => updateEnvironment(serviceIndex, items => [...items, {}])}
                                                            >
                                                                <PlusIcon />
                                                                新增环境变量
                                                            </Button>
                                                        </div>
                                                        <div className="space-y-2">
                                                            {(service.environment ?? []).map((item, environmentIndex) => (
                                                                <div key={environmentIndex} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-2">
                                                                    <Input
                                                                        value={item.key ?? ""}
                                                                        disabled={isRequesting}
                                                                        placeholder="KEY"
                                                                        onChange={event =>
                                                                            updateEnvironment(serviceIndex, items =>
                                                                                items.map((current, index) =>
                                                                                    index === environmentIndex
                                                                                        ? { ...current, key: event.target.value }
                                                                                        : current))
                                                                        }
                                                                    />
                                                                    <Input
                                                                        value={item.value ?? ""}
                                                                        disabled={isRequesting}
                                                                        placeholder="VALUE"
                                                                        onChange={event =>
                                                                            updateEnvironment(serviceIndex, items =>
                                                                                items.map((current, index) =>
                                                                                    index === environmentIndex
                                                                                        ? { ...current, value: event.target.value }
                                                                                        : current))
                                                                        }
                                                                    />
                                                                    <Button
                                                                        type="button"
                                                                        size="icon"
                                                                        variant="ghost"
                                                                        title="移除环境变量"
                                                                        disabled={isRequesting}
                                                                        onClick={() =>
                                                                            updateEnvironment(serviceIndex, items =>
                                                                                items.filter((_, index) => index !== environmentIndex))
                                                                        }
                                                                    >
                                                                        <Trash2Icon />
                                                                    </Button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </Field>
                                                </div>
                                            ))}
                                            {services.length === 0 && (
                                                <div className="rounded-2xl border border-dashed bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
                                                    暂无服务配置，可直接编辑 YAML 或新增服务。
                                                </div>
                                            )}
                                        </div>
                                    )
                                }}
                            </form.Subscribe>
                        </div>
                    </div>
                </div>
                <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl border bg-card">
                    <div className="flex min-h-12 flex-none flex-wrap items-center justify-between gap-2 border-b px-4 py-2">
                        <div className="font-medium">YAML 编辑</div>
                        <div className="flex flex-wrap gap-2">
                            <div className="w-44">
                                <OptionSelect
                                    value={editorTheme}
                                    options={monacoThemeOptions.map(item => ({ label: item.label, value: item.value }))}
                                    placeholder="编辑器主题"
                                    disabled={isRequesting}
                                    onValueChange={value => value && setEditorTheme(value)}
                                />
                            </div>
                            <div className="w-24">
                                <OptionSelect
                                    value={`${editorFontSize}`}
                                    options={[12, 13, 14, 15, 16, 17, 18, 19, 20].map(value => ({ label: `${value}px`, value: `${value}` }))}
                                    placeholder="字号"
                                    disabled={isRequesting}
                                    onValueChange={value => value && setEditorFontSize(Number(value))}
                                />
                            </div>
                        </div>
                    </div>
                    <div className="min-h-0 flex-1">
                        {isEditorReady ? (
                            <Editor
                                height="100%"
                                language="yaml"
                                value={yamlValue}
                                theme={editorTheme}
                                options={{
                                    minimap: { enabled: false },
                                    fontSize: editorFontSize,
                                    lineNumbers: "on",
                                    wordWrap: "on",
                                    scrollBeyondLastLine: false,
                                    automaticLayout: true,
                                    tabSize: 2,
                                }}
                                onChange={value => setYamlValue(value ?? "")}
                                onMount={(_editor, monaco) => setMonacoInstance(monaco)}
                            />
                        ) : (
                            <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
                                <LoaderCircleIcon className="size-4 animate-spin" />
                                正在初始化 YAML 编辑器...
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <datalist id="docker-image-options">
                {imageOptions.map(item => (
                    <option key={item} value={item} />
                ))}
            </datalist>
        </div>
    )
}

export default Page
