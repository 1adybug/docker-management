"use client"

import { FC, useEffect, useMemo, useState } from "react"

import Editor from "@monaco-editor/react"
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
    ProjectFormData,
} from "../_utils/compose"

let isMonacoConfigured = false

async function ensureMonacoConfigured() {
    if (typeof window === "undefined") return
    if (isMonacoConfigured) return

    await import("monaco-editor/esm/vs/basic-languages/yaml/yaml.contribution")

    const globalAny = globalThis as unknown as {
        MonacoEnvironment?: {
            getWorker: (moduleId: string, label: string) => Worker
        }
    }

    // 配置 Monaco Worker，避免 CDN 依赖
    globalAny.MonacoEnvironment = {
        getWorker(moduleId, label) {
            if (label === "editorWorkerService") return new Worker(new URL("monaco-editor/esm/vs/editor/editor.worker.js", import.meta.url), { type: "module" })

            return new Worker(new URL("monaco-editor/esm/vs/editor/editor.worker.js", import.meta.url), { type: "module" })
        },
    }

    isMonacoConfigured = true
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

function getServiceNames(services?: ProjectFormData["services"]) {
    return (services ?? [])
        .map(item => item?.name?.trim())
        .filter(isNonNullable)
        .filter(Boolean)
}

const Page: FC = () => {
    const router = useRouter()
    const searchParams = useSearchParams()
    const searchName = searchParams.get("name") ?? undefined
    const isUpdate = isNonNullable(searchName)

    const [form] = useForm<ProjectFormData>()
    const [yamlValue, setYamlValue] = useState(defaultComposeContent)
    const [composeData, setComposeData] = useState<ComposeFile | undefined>(undefined)
    const [editorTheme, setEditorTheme] = useState(monacoThemeOptions[0]?.value ?? "night-owl")
    const [editorFontSize, setEditorFontSize] = useState(16)
    const [monacoInstance, setMonacoInstance] = useState<unknown>(undefined)

    const { data, isLoading } = useGetProject(isUpdate ? { name: searchName! } : undefined, { enabled: isUpdate })
    const projectData = isUpdate ? data : undefined
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

    useEffect(() => void ensureMonacoConfigured(), [])

    useEffect(() => {
        const content = projectData?.content ?? defaultComposeContent

        // eslint-disable-next-line react-hooks/set-state-in-effect
        setYamlValue(content)

        try {
            const compose = parseComposeYaml(content)
            setComposeData(compose)
            form.setFieldsValue({ ...composeToFormData(compose), name: projectData?.name ?? searchName })
        } catch {
            setComposeData(undefined)
            form.setFieldsValue({ name: projectData?.name ?? searchName })
        }
    }, [projectData, form, searchName])

    useEffect(() => {
        if (!monacoInstance) return
        const theme = monacoThemeMap[editorTheme]
        if (!theme) return
        const editorApi = monacoInstance as { editor: { defineTheme: (name: string, theme: unknown) => void; setTheme: (name: string) => void } }
        editorApi.editor.defineTheme(editorTheme, theme)
        editorApi.editor.setTheme(editorTheme)
    }, [editorTheme, monacoInstance])

    const isRequesting = isLoading || isAddPending || isUpdatePending

    function onBack() {
        router.push("/project")
    }

    async function onSyncYamlToForm() {
        try {
            const compose = parseComposeYaml(yamlValue)
            setComposeData(compose)
            form.setFieldsValue({ ...composeToFormData(compose), name: form.getFieldValue("name") })
            message.open({ type: "success", content: "YAML 已同步到表单" })
        } catch {
            message.open({ type: "error", content: "YAML 解析失败，请检查内容" })
        }
    }

    async function onSyncFormToYaml() {
        try {
            const values = await form.validateFields()
            const content = formDataToYaml(values, composeData)
            setComposeData(formDataToCompose(values, composeData))
            setYamlValue(content)
            message.open({ type: "success", content: "表单已同步到 YAML" })
        } catch {}
    }

    async function onSaveForm() {
        try {
            const values = await form.validateFields()
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
        const projectName = isUpdate ? searchName : form.getFieldValue("name")

        if (!projectName) {
            form.validateFields(["name"])
            return
        }

        try {
            const compose = parseComposeYaml(yamlValue)
            setComposeData(compose)
            form.setFieldsValue({ ...composeToFormData(compose), name: projectName })
        } catch {
            message.open({ type: "error", content: "YAML 解析失败，请检查内容" })
            return
        }

        if (isUpdate) await updateProject({ name: projectName, content: yamlValue })
        else await addProject({ name: projectName, content: yamlValue })
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
            <title>{isUpdate ? "编辑项目" : "新增项目"}</title>
            <div className="flex flex-wrap items-center gap-2 px-4">
                <div>{isUpdate ? "编辑项目" : "新增项目"}</div>
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
                            <Form<ProjectFormData> form={form} layout="vertical" disabled={isRequesting}>
                                <FormItem<ProjectFormData> name="name" label="项目名称" rules={[schemaToRule(projectNameSchema)]}>
                                    <Input disabled={isUpdate} placeholder="仅支持字母、数字、下划线和短横线" />
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
                                                <Button type="dashed" onClick={() => add({})}>
                                                    新增服务
                                                </Button>
                                            </div>
                                            {fields.map(field => {
                                                const serviceName = form.getFieldValue(["services", field.name, "name"])

                                                return (
                                                    <div key={field.key} className="rounded border border-solid border-neutral-200 p-4">
                                                        <div className="mb-4 flex items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-medium">服务</span>
                                                                {serviceName ? <Tag color="blue">{serviceName}</Tag> : null}
                                                            </div>
                                                            <Button danger type="link" onClick={() => remove(field.name)}>
                                                                删除服务
                                                            </Button>
                                                        </div>
                                                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                                                            <FormItem name={[field.name, "command"]} label="启动命令">
                                                                <Input placeholder="例如: npm run start" />
                                                            </FormItem>
                                                            <FormItem name={[field.name, "dependsOn"]} label="依赖服务">
                                                                <Select mode="multiple" options={serviceNameOptions} placeholder="选择依赖服务" />
                                                            </FormItem>
                                                            <FormItem name={[field.name, "networks"]} label="服务网络">
                                                                <Select mode="tags" options={networkOptions} placeholder="输入并回车创建网络" />
                                                            </FormItem>
                                                        </div>
                                                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                                            <FormItem<ProjectFormData> label="端口映射" className="mb-0">
                                                                <Form.List name={[field.name, "ports"]}>
                                                                    {(portFields, { add: addPort, remove: removePort }) => (
                                                                        <div className="flex flex-col gap-2">
                                                                            {portFields.map(portField => (
                                                                                <div key={portField.key} className="flex items-start gap-2">
                                                                                    <FormItem name={portField.name} className="mb-0 flex-1">
                                                                                        <Input placeholder="例如: 8080:80" />
                                                                                    </FormItem>
                                                                                    <Button type="text" danger onClick={() => removePort(portField.name)}>
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
                                                            <FormItem<ProjectFormData> label="挂载卷" className="mb-0">
                                                                <Form.List name={[field.name, "volumes"]}>
                                                                    {(volumeFields, { add: addVolume, remove: removeVolume }) => (
                                                                        <div className="flex flex-col gap-2">
                                                                            {volumeFields.map(volumeField => (
                                                                                <div key={volumeField.key} className="flex items-start gap-2">
                                                                                    <FormItem name={volumeField.name} className="mb-0 flex-1">
                                                                                        <Input placeholder="例如: ./data:/app/data" />
                                                                                    </FormItem>
                                                                                    <Button type="text" danger onClick={() => removeVolume(volumeField.name)}>
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
                                                        <FormItem<ProjectFormData> label="环境变量" className="mb-0 mt-4">
                                                            <Form.List name={[field.name, "environment"]}>
                                                                {(envFields, { add: addEnv, remove: removeEnv }) => (
                                                                    <div className="flex flex-col gap-2">
                                                                        {envFields.map(envField => (
                                                                            <div key={envField.key} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                                                                                <FormItem name={[envField.name, "key"]} className="mb-0">
                                                                                    <Input placeholder="KEY" />
                                                                                </FormItem>
                                                                                <FormItem name={[envField.name, "value"]} className="mb-0">
                                                                                    <Input placeholder="VALUE" />
                                                                                </FormItem>
                                                                                <Button type="text" danger onClick={() => removeEnv(envField.name)}>
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
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Page
