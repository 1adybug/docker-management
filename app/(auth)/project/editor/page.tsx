"use client"

import { FC, useEffect, useMemo, useState } from "react"

import Editor, { loader } from "@monaco-editor/react"
import { AutoComplete, Button, Form, Input, Select, Tag } from "antd"
import { useForm } from "antd/es/form/Form"
import FormItem from "antd/es/form/FormItem"
import { isNonNullable } from "deepsea-tools"
import { useRouter, useSearchParams } from "next/navigation"
import { schemaToRule } from "soda-antd"

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

import { useAddProject } from "@/hooks/useAddProject"
import { useGetProject } from "@/hooks/useGetProject"
import { useQueryDockerImage } from "@/hooks/useQueryDockerImage"
import { useUpdateProject } from "@/hooks/useUpdateProject"

import { projectNameSchema } from "@/schemas/projectName"

import {
    ComposeFile,
    ComposeRestartPolicy,
    composeToFormData,
    defaultComposeContent,
    formDataToCompose,
    formDataToYaml,
    parseComposeYaml,
    ProjectFormCommandMode,
    ProjectFormData,
} from "@/utils/compose"

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

async function ensureMonacoConfigured() {
    if (typeof window === "undefined") return
    if (isMonacoConfigured) return
    if (monacoConfigurePromise) return monacoConfigurePromise

    monacoConfigurePromise = (async function configureMonaco() {
        const monaco = await import("monaco-editor")

        // @ts-expect-error: monaco-editor ESM internals don't have type declarations
        await import("monaco-editor/esm/vs/basic-languages/yaml/yaml.contribution")

        const globalAny = globalThis as MonacoGlobal

        // 配置 Monaco Worker，并且强制使用本地 monaco 资源，避免走 CDN
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

export interface MonacoThemeOption {
    name: string
    label: string
    value: string
}

export interface MonacoThemeMap {
    [key: string]: unknown
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

function getRestartOptions() {
    return Object.entries(ComposeRestartPolicy).map(([label, value]) => ({
        label,
        value,
    }))
}

function getCommandModeOptions() {
    return Object.entries(ProjectFormCommandMode).map(([label, value]) => ({
        label,
        value,
    }))
}

function getDependsOnConditionOptions() {
    return [
        { label: "服务启动后", value: "service_started" },
        { label: "服务健康后", value: "service_healthy" },
        { label: "服务成功完成后", value: "service_completed_successfully" },
    ]
}

function getBooleanOptions() {
    return [
        { label: "是", value: true },
        { label: "否", value: false },
    ]
}

function getServiceNames(services?: ProjectFormData["services"]) {
    return (services ?? [])
        .map(item => item?.name?.trim())
        .filter(isNonNullable)
        .filter(Boolean)
}

function getComposeFormData(compose: ComposeFile, name?: string) {
    const values = composeToFormData(compose)

    if (!name) return values

    return {
        ...values,
        name,
    } as ProjectFormData
}

const Page: FC = () => {
    const router = useRouter()
    const searchParams = useSearchParams()
    const searchName = searchParams.get("name") ?? undefined
    const searchCopyFrom = searchParams.get("copyFrom") ?? undefined
    const isCopy = isNonNullable(searchCopyFrom)
    const isUpdate = isNonNullable(searchName) && !isCopy

    const [form] = useForm<ProjectFormData>()
    const [yamlValue, setYamlValue] = useState(defaultComposeContent)
    const [composeData, setComposeData] = useState<ComposeFile | undefined>(undefined)
    const [editorTheme, setEditorTheme] = useState(monacoThemeOptions[0]?.value ?? "night-owl")
    const [editorFontSize, setEditorFontSize] = useState(16)
    const [isEditorReady, setIsEditorReady] = useState(false)
    const [monacoInstance, setMonacoInstance] = useState<unknown>(undefined)

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

    const serviceList = Form.useWatch("services", form) as ProjectFormData["services"]
    const networkList = Form.useWatch("networks", form) as ProjectFormData["networks"]

    const serviceNameOptions = useMemo(() => getServiceNames(serviceList).map(item => ({ value: item })), [serviceList])
    const networkOptions = useMemo(() => (networkList ?? []).map(item => ({ value: item })), [networkList])
    const imageOptions = useMemo(() => (imageData ?? []).map(item => ({ value: item.name })), [imageData])
    const restartOptions = useMemo(() => getRestartOptions(), [])
    const commandModeOptions = useMemo(() => getCommandModeOptions(), [])
    const dependsOnConditionOptions = useMemo(() => getDependsOnConditionOptions(), [])
    const booleanOptions = useMemo(() => getBooleanOptions(), [])

    useEffect(() => {
        let isMounted = true

        void ensureMonacoConfigured()
            .then(() => {
                if (!isMounted) return
                setIsEditorReady(true)
            })
            .catch(() => {
                if (!isMounted) return
                message.open({ type: "error", content: "YAML 编辑器初始化失败" })
            })

        return () => {
            isMounted = false
        }
    }, [])

    useEffect(() => {
        const content = projectData?.content ?? defaultComposeContent
        const formName = isUpdate ? (projectData?.name ?? searchName) : undefined

        setYamlValue(content)

        try {
            const compose = parseComposeYaml(content)
            setComposeData(compose)
            form.setFieldsValue(getComposeFormData(compose, formName))
        } catch {
            setComposeData(undefined)
            form.setFieldsValue({ name: formName })
        }
    }, [projectData, form, searchName, isUpdate])

    useEffect(() => {
        if (!monacoInstance) return
        const theme = monacoThemeMap[editorTheme]
        if (!theme) return
        const editorApi = monacoInstance as MonacoInstance
        editorApi.editor.defineTheme(editorTheme, theme)
        editorApi.editor.setTheme(editorTheme)
    }, [editorTheme, monacoInstance])

    const isRequesting = isLoading || isAddPending || isUpdatePending

    function onBack() {
        router.push("/project")
    }

    async function getValidatedFormData() {
        await form.validateFields()
        return form.getFieldsValue(true) as ProjectFormData
    }

    async function onSyncYamlToForm() {
        try {
            const compose = parseComposeYaml(yamlValue)
            setComposeData(compose)
            form.setFieldsValue(getComposeFormData(compose, isUpdate ? (searchName ?? undefined) : undefined))
            message.open({ type: "success", content: "YAML 已同步到表单" })
        } catch {
            message.open({ type: "error", content: "YAML 解析失败，请检查内容" })
        }
    }

    async function onSyncFormToYaml() {
        try {
            const values = await getValidatedFormData()
            const content = formDataToYaml(values, composeData)
            setComposeData(formDataToCompose(values, composeData))
            setYamlValue(content)
            message.open({ type: "success", content: "表单已同步到 YAML" })
        } catch {}
    }

    async function onSaveForm() {
        try {
            const values = await getValidatedFormData()
            const projectName = isUpdate ? searchName : values.name
            if (!projectName) return

            const content = formDataToYaml(values, composeData)
            setYamlValue(content)
            setComposeData(formDataToCompose(values, composeData))

            if (isUpdate) await updateProject({ name: projectName, content })
            else await addProject({ name: projectName, content })
        } catch {}
    }

    async function onSaveYaml() {
        try {
            const compose = parseComposeYaml(yamlValue)
            const composeValues = composeToFormData(compose)
            const projectName = isUpdate ? searchName : (form.getFieldValue("name") ?? composeValues.name)

            if (!projectName) {
                form.validateFields(["name"])
                return
            }

            if (!composeValues.xName) {
                form.setFields([
                    {
                        name: "xName",
                        errors: ["请输入显示名称"],
                    },
                ])

                return
            }

            const nextValues = getComposeFormData(compose, projectName)
            const content = formDataToYaml(nextValues, compose)
            const nextCompose = formDataToCompose(nextValues, compose)

            setComposeData(nextCompose)
            setYamlValue(content)
            form.setFieldsValue(nextValues)

            if (isUpdate) await updateProject({ name: projectName, content })
            else await addProject({ name: projectName, content })
        } catch {
            message.open({ type: "error", content: "YAML 解析失败，请检查内容" })
        }
    }

    function onYamlChange(value?: string) {
        setYamlValue(value ?? "")
    }

    function onEditorMount(editor: unknown, monaco: unknown) {
        setMonacoInstance(monaco)
    }

    function onThemeChange(value: string) {
        setEditorTheme(value)
    }

    function onFontSizeChange(value: number) {
        setEditorFontSize(value)
    }

    return (
        <div className="flex h-full flex-col gap-4 pt-4">
            <title>{isUpdate ? "编辑项目" : isCopy ? "复制项目" : "新增项目"}</title>
            <div className="flex flex-wrap items-center gap-2 px-4">
                <div>{isUpdate ? "编辑项目" : isCopy ? "复制项目" : "新增项目"}</div>
                <div className="ml-auto flex flex-wrap gap-2">
                    <Button disabled={isRequesting} onClick={onSyncYamlToForm}>
                        从 YAML 同步
                    </Button>
                    <Button disabled={isRequesting} onClick={onSyncFormToYaml}>
                        同步到 YAML
                    </Button>
                    <Button type="primary" loading={isRequesting} onClick={onSaveForm}>
                        保存表单
                    </Button>
                    <Button type="primary" loading={isRequesting} onClick={onSaveYaml}>
                        保存 YAML
                    </Button>
                    <Button disabled={isRequesting} onClick={onBack}>
                        返回
                    </Button>
                </div>
            </div>
            <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 px-4 pb-4 lg:grid-cols-2">
                <div className="flex min-h-0 flex-col rounded border border-solid border-neutral-200 py-4">
                    <div className="mb-4 flex h-9 items-center px-4 text-base font-medium">表单编辑</div>
                    <div className="min-h-0 flex-1 overflow-auto">
                        <div className="pl-4 pr-[calc(16px-((100vw-32px)-100%))] lg:pr-[calc(16px-((100vw-48px)/2-100%))]">
                            <Form<ProjectFormData> name="project-editor" form={form} layout="vertical" disabled={isRequesting}>
                                <FormItem<ProjectFormData> name="name" label="英文名称" rules={[schemaToRule(projectNameSchema)]}>
                                    <Input disabled={isUpdate} placeholder="仅支持字母、数字、下划线和短横线" />
                                </FormItem>
                                <FormItem<ProjectFormData>
                                    name="xName"
                                    label="项目名称"
                                    required={false}
                                    rules={[{ required: true, message: "请输入项目名称" }]}
                                >
                                    <Input placeholder="对应 YAML 中的 x-name 字段" />
                                </FormItem>
                                <FormItem<ProjectFormData> name="description" label="项目描述">
                                    <Input.TextArea autoSize={{ minRows: 1, maxRows: 4 }} />
                                </FormItem>
                                <div className="grid grid-cols-1 gap-4 rounded border border-solid border-neutral-200 p-4">
                                    <FormItem<ProjectFormData> name="networks" label="网络">
                                        <Select mode="tags" placeholder="输入并回车创建网络" />
                                    </FormItem>
                                    <FormItem<ProjectFormData> name="volumes" label="数据卷">
                                        <Select mode="tags" placeholder="输入并回车创建数据卷" />
                                    </FormItem>
                                </div>
                                <Form.List name="services">
                                    {(fields, { add, remove }) => (
                                        <div className="mt-4 flex flex-col gap-4">
                                            <div className="flex items-center justify-between">
                                                <div className="font-medium">服务配置</div>
                                                <Button
                                                    type="dashed"
                                                    onClick={() =>
                                                        add({
                                                            commandMode: ProjectFormCommandMode.字符串,
                                                            entrypointMode: ProjectFormCommandMode.字符串,
                                                        })
                                                    }
                                                >
                                                    新增服务
                                                </Button>
                                            </div>
                                            {fields.map(field => {
                                                const serviceName = form.getFieldValue(["services", field.name, "name"])
                                                const entrypointMode =
                                                    form.getFieldValue(["services", field.name, "entrypointMode"]) ?? ProjectFormCommandMode.字符串
                                                const commandMode = form.getFieldValue(["services", field.name, "commandMode"]) ?? ProjectFormCommandMode.字符串

                                                return (
                                                    <div key={field.key} className="rounded border border-solid border-neutral-200 p-4">
                                                        <div className="mb-6 flex items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-medium">服务</span>
                                                                {serviceName ? <Tag color="blue">{serviceName}</Tag> : null}
                                                            </div>
                                                            <Button danger type="link" onClick={() => remove(field.name)}>
                                                                删除服务
                                                            </Button>
                                                        </div>
                                                        <div className="grid grid-cols-1 gap-x-4 gap-y-0 md:grid-cols-2">
                                                            <FormItem
                                                                name={[field.name, "name"]}
                                                                label="服务名称"
                                                                rules={[{ required: true, message: "请输入服务名称" }]}
                                                            >
                                                                <Input placeholder="例如: web" />
                                                            </FormItem>
                                                            <FormItem name={[field.name, "image"]} label="镜像">
                                                                <AutoComplete options={imageOptions} placeholder="例如: nginx:latest" />
                                                            </FormItem>
                                                            <FormItem name={[field.name, "containerName"]} label="容器名称">
                                                                <Input placeholder="例如: web-app" />
                                                            </FormItem>
                                                            <FormItem name={[field.name, "restart"]} label="重启策略">
                                                                <Select allowClear options={restartOptions} placeholder="选择重启策略" />
                                                            </FormItem>
                                                            <FormItem name={[field.name, "entrypointMode"]} label="入口点类型">
                                                                <Select options={commandModeOptions} placeholder="选择入口点类型" />
                                                            </FormItem>
                                                            <FormItem name={[field.name, "commandMode"]} label="命令类型">
                                                                <Select options={commandModeOptions} placeholder="选择命令类型" />
                                                            </FormItem>
                                                            <FormItem name={[field.name, "networks"]} label="服务网络">
                                                                <Select mode="tags" options={networkOptions} placeholder="输入并回车创建网络" />
                                                            </FormItem>
                                                        </div>
                                                        {entrypointMode === ProjectFormCommandMode.数组 ? (
                                                            <FormItem<ProjectFormData> label="入口点">
                                                                <Form.List name={[field.name, "entrypointItems"]}>
                                                                    {(entrypointFields, { add: addEntrypoint, remove: removeEntrypoint }) => (
                                                                        <div className="flex flex-col gap-2">
                                                                            {entrypointFields.map(entrypointField => (
                                                                                <div key={entrypointField.key} className="flex items-start gap-2">
                                                                                    <FormItem
                                                                                        name={entrypointField.name}
                                                                                        className="flex-1"
                                                                                        rules={[{ required: true, message: "请输入入口点项" }]}
                                                                                    >
                                                                                        <Input placeholder="例如: sh" />
                                                                                    </FormItem>
                                                                                    <Button
                                                                                        className="flex-none"
                                                                                        type="text"
                                                                                        danger
                                                                                        onClick={() => removeEntrypoint(entrypointField.name)}
                                                                                    >
                                                                                        移除
                                                                                    </Button>
                                                                                </div>
                                                                            ))}
                                                                            <Button className="self-start" type="dashed" onClick={() => addEntrypoint("")}>
                                                                                新增入口点项
                                                                            </Button>
                                                                        </div>
                                                                    )}
                                                                </Form.List>
                                                            </FormItem>
                                                        ) : (
                                                            <FormItem name={[field.name, "entrypoint"]} label="入口点">
                                                                <Input placeholder="例如: sh -c" />
                                                            </FormItem>
                                                        )}
                                                        {commandMode === ProjectFormCommandMode.数组 ? (
                                                            <FormItem<ProjectFormData> label="启动命令">
                                                                <Form.List name={[field.name, "commandItems"]}>
                                                                    {(commandFields, { add: addCommand, remove: removeCommand }) => (
                                                                        <div className="flex flex-col gap-2">
                                                                            {commandFields.map(commandField => (
                                                                                <div key={commandField.key} className="flex items-start gap-2">
                                                                                    <FormItem
                                                                                        name={commandField.name}
                                                                                        className="flex-1"
                                                                                        rules={[{ required: true, message: "请输入命令项" }]}
                                                                                    >
                                                                                        <Input placeholder="例如: npm" />
                                                                                    </FormItem>
                                                                                    <Button
                                                                                        className="flex-none"
                                                                                        type="text"
                                                                                        danger
                                                                                        onClick={() => removeCommand(commandField.name)}
                                                                                    >
                                                                                        移除
                                                                                    </Button>
                                                                                </div>
                                                                            ))}
                                                                            <Button className="self-start" type="dashed" onClick={() => addCommand("")}>
                                                                                新增命令项
                                                                            </Button>
                                                                        </div>
                                                                    )}
                                                                </Form.List>
                                                            </FormItem>
                                                        ) : (
                                                            <FormItem name={[field.name, "command"]} label="启动命令">
                                                                <Input placeholder="例如: npm run start" />
                                                            </FormItem>
                                                        )}
                                                        <FormItem<ProjectFormData> label="依赖服务">
                                                            <Form.List name={[field.name, "dependsOnItems"]}>
                                                                {(dependsOnFields, { add: addDependsOn, remove: removeDependsOn }) => (
                                                                    <div className="flex flex-col gap-2">
                                                                        {dependsOnFields.map(dependsOnField => (
                                                                            <div
                                                                                key={dependsOnField.key}
                                                                                className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]"
                                                                            >
                                                                                <FormItem
                                                                                    name={[dependsOnField.name, "serviceName"]}
                                                                                    rules={[{ required: true, message: "请选择依赖服务" }]}
                                                                                >
                                                                                    <Select
                                                                                        allowClear
                                                                                        options={serviceNameOptions.filter(item => item.value !== serviceName)}
                                                                                        placeholder="选择依赖服务"
                                                                                    />
                                                                                </FormItem>
                                                                                <FormItem name={[dependsOnField.name, "condition"]}>
                                                                                    <Select
                                                                                        allowClear
                                                                                        options={dependsOnConditionOptions}
                                                                                        placeholder="依赖条件"
                                                                                    />
                                                                                </FormItem>
                                                                                <FormItem name={[dependsOnField.name, "restart"]}>
                                                                                    <Select allowClear options={booleanOptions} placeholder="变更时重启" />
                                                                                </FormItem>
                                                                                <FormItem name={[dependsOnField.name, "required"]}>
                                                                                    <Select allowClear options={booleanOptions} placeholder="是否必需" />
                                                                                </FormItem>
                                                                                <Button
                                                                                    className="flex-none"
                                                                                    type="text"
                                                                                    danger
                                                                                    onClick={() => removeDependsOn(dependsOnField.name)}
                                                                                >
                                                                                    移除
                                                                                </Button>
                                                                            </div>
                                                                        ))}
                                                                        <Button className="self-start" type="dashed" onClick={() => addDependsOn({})}>
                                                                            新增依赖
                                                                        </Button>
                                                                    </div>
                                                                )}
                                                            </Form.List>
                                                        </FormItem>
                                                        <div className="grid grid-cols-1 gap-x-4 gap-y-0 md:grid-cols-2">
                                                            <FormItem<ProjectFormData> label="端口映射">
                                                                <Form.List name={[field.name, "ports"]}>
                                                                    {(portFields, { add: addPort, remove: removePort }) => (
                                                                        <div className="flex flex-col gap-2">
                                                                            {portFields.map(portField => (
                                                                                <div key={portField.key} className="flex items-start gap-2">
                                                                                    <FormItem name={portField.name} className="flex-1">
                                                                                        <Input placeholder="例如: 8080:80" />
                                                                                    </FormItem>
                                                                                    <Button
                                                                                        className="flex-none"
                                                                                        type="text"
                                                                                        danger
                                                                                        onClick={() => removePort(portField.name)}
                                                                                    >
                                                                                        移除
                                                                                    </Button>
                                                                                </div>
                                                                            ))}
                                                                            <Button type="dashed" onClick={() => addPort("")}>
                                                                                新增端口
                                                                            </Button>
                                                                        </div>
                                                                    )}
                                                                </Form.List>
                                                            </FormItem>
                                                            <FormItem<ProjectFormData> label="挂载卷">
                                                                <Form.List name={[field.name, "volumes"]}>
                                                                    {(volumeFields, { add: addVolume, remove: removeVolume }) => (
                                                                        <div className="flex flex-col gap-2">
                                                                            {volumeFields.map(volumeField => (
                                                                                <div key={volumeField.key} className="flex items-start gap-2">
                                                                                    <FormItem name={volumeField.name} className="flex-1">
                                                                                        <Input placeholder="例如: ./data:/app/data" />
                                                                                    </FormItem>
                                                                                    <Button
                                                                                        className="flex-none"
                                                                                        type="text"
                                                                                        danger
                                                                                        onClick={() => removeVolume(volumeField.name)}
                                                                                    >
                                                                                        移除
                                                                                    </Button>
                                                                                </div>
                                                                            ))}
                                                                            <Button type="dashed" onClick={() => addVolume("")}>
                                                                                新增挂载
                                                                            </Button>
                                                                        </div>
                                                                    )}
                                                                </Form.List>
                                                            </FormItem>
                                                        </div>
                                                        <FormItem<ProjectFormData> label="环境变量">
                                                            <Form.List name={[field.name, "environment"]}>
                                                                {(envFields, { add: addEnv, remove: removeEnv }) => (
                                                                    <div className="flex flex-col gap-2">
                                                                        {envFields.map(envField => (
                                                                            <div key={envField.key} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                                                                                <FormItem name={[envField.name, "key"]}>
                                                                                    <Input placeholder="KEY" />
                                                                                </FormItem>
                                                                                <FormItem name={[envField.name, "value"]}>
                                                                                    <Input placeholder="VALUE" />
                                                                                </FormItem>
                                                                                <Button
                                                                                    className="flex-none"
                                                                                    type="text"
                                                                                    danger
                                                                                    onClick={() => removeEnv(envField.name)}
                                                                                >
                                                                                    移除
                                                                                </Button>
                                                                            </div>
                                                                        ))}
                                                                        <Button type="dashed" onClick={() => addEnv({})}>
                                                                            新增环境变量
                                                                        </Button>
                                                                    </div>
                                                                )}
                                                            </Form.List>
                                                        </FormItem>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )}
                                </Form.List>
                            </Form>
                        </div>
                    </div>
                </div>
                <div className="flex min-h-0 flex-col rounded border border-solid border-neutral-200 p-4">
                    <div className="mb-4 flex h-9 items-center justify-between gap-2">
                        <div className="text-base font-medium">YAML 编辑</div>
                        <div className="flex gap-2">
                            <Select
                                className="ml-auto min-w-[180px]"
                                value={editorTheme}
                                options={monacoThemeOptions.map(item => ({ label: item.label, value: item.value }))}
                                onChange={onThemeChange}
                            />
                            <Select
                                className="min-w-[110px]"
                                value={editorFontSize}
                                options={[12, 13, 14, 15, 16, 17, 18, 19, 20].map(value => ({ label: `${value}px`, value }))}
                                onChange={onFontSizeChange}
                            />
                        </div>
                    </div>
                    <div className="min-h-0 flex-1 overflow-auto">
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
                                onChange={onYamlChange}
                                onMount={onEditorMount}
                            />
                        ) : (
                            <div className="flex h-full items-center justify-center text-sm text-neutral-500">正在初始化 YAML 编辑器...</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Page
