import { isNonNullable } from "deepsea-tools"
import { parse, stringify } from "yaml"

export const ComposeRestartPolicy = {
    不重启: "no",
    总是: "always",
    失败重启: "on-failure",
    除非停止: "unless-stopped",
} as const

export type ComposeRestartPolicy = (typeof ComposeRestartPolicy)[keyof typeof ComposeRestartPolicy]

export const ProjectFormCommandMode = {
    字符串: "string",
    数组: "array",
} as const

export type ProjectFormCommandMode = (typeof ProjectFormCommandMode)[keyof typeof ProjectFormCommandMode]

export interface ComposeEnvironmentMap {
    [key: string]: string
}

export interface ComposeDependsOnConfig {
    condition?: string
    restart?: boolean
    required?: boolean
}

export interface ComposeDependsOnMap {
    [key: string]: ComposeDependsOnConfig
}

export interface ComposeService {
    image?: string
    container_name?: string
    ports?: string[]
    environment?: ComposeEnvironmentMap | string[]
    entrypoint?: string | string[]
    volumes?: string[]
    command?: string | string[]
    restart?: string
    depends_on?: string[] | ComposeDependsOnMap
    networks?: string[]
}

export interface ComposeServiceMap {
    [key: string]: ComposeService
}

export interface ComposeNetwork {
    [key: string]: unknown
}

export interface ComposeNetworkMap {
    [key: string]: ComposeNetwork
}

export interface ComposeVolume {
    [key: string]: unknown
}

export interface ComposeVolumeMap {
    [key: string]: ComposeVolume
}

export interface ComposeFile {
    "x-name"?: string
    "x-description"?: string
    services?: ComposeServiceMap
    networks?: ComposeNetworkMap
    volumes?: ComposeVolumeMap
    [key: string]: unknown
}

export interface ProjectFormKeyValue {
    key?: string
    value?: string
}

export interface ProjectFormDependsOnItem {
    serviceName?: string
    condition?: string
    restart?: boolean
    required?: boolean
}

export interface ProjectFormService {
    name?: string
    image?: string
    containerName?: string
    ports?: string[]
    environment?: ProjectFormKeyValue[]
    entrypointMode?: ProjectFormCommandMode
    entrypoint?: string
    entrypointItems?: string[]
    volumes?: string[]
    commandMode?: ProjectFormCommandMode
    command?: string
    commandItems?: string[]
    restart?: ComposeRestartPolicy
    dependsOnItems?: ProjectFormDependsOnItem[]
    networks?: string[]
}

export interface ProjectFormData {
    name?: string
    xName?: string
    description?: string
    services?: ProjectFormService[]
    networks?: string[]
    volumes?: string[]
}

export interface NormalizeComposeProjectContentParams {
    content: string
}

export interface BuildDependsOnValueParams {
    dependsOnItems?: ProjectFormDependsOnItem[]
}

export interface BuildCommandValueParams {
    mode?: ProjectFormCommandMode
    text?: string
    items?: string[]
}

export const defaultComposeContent = "{}\n"

export const composeNameKey = "x-name"

export const composeDescriptionKey = "x-description"

function normalizeStringArray(value: unknown) {
    if (!value) return undefined
    if (Array.isArray(value)) return value.map(item => String(item)).filter(Boolean)
    if (typeof value === "string") return [value]
    return undefined
}

function normalizeKeyList(value: unknown) {
    if (!value) return undefined
    if (Array.isArray(value)) return value.map(item => String(item)).filter(Boolean)
    if (typeof value === "object") return Object.keys(value as Record<string, unknown>).filter(Boolean)
    return undefined
}

function normalizeEnvList(value: ComposeEnvironmentMap | string[] | undefined) {
    if (!value) return undefined

    if (Array.isArray(value)) {
        return value
            .map(item => {
                const [key, ...rest] = String(item).split("=")
                return {
                    key: key?.trim(),
                    value: rest.join("=").trim(),
                } as ProjectFormKeyValue
            })
            .filter(item => item.key)
    }

    return Object.entries(value).map(([key, val]) => ({
        key,
        value: String(val ?? ""),
    }))
}

function normalizeDependsOnItems(value: ComposeService["depends_on"]) {
    if (!value) return undefined

    if (Array.isArray(value)) {
        const items = value
            .map(item => cleanString(String(item)))
            .filter(isNonNullable)
            .map(serviceName => ({ serviceName }))

        return items.length > 0 ? items : undefined
    }

    if (typeof value !== "object") return undefined

    const items = Object.entries(value).map(([serviceName, config]) => ({
        serviceName,
        condition: config?.condition,
        restart: config?.restart,
        required: config?.required,
    }))

    return items.length > 0 ? items : undefined
}

function normalizeCommandMode(value: string | string[] | undefined) {
    if (Array.isArray(value)) return ProjectFormCommandMode.数组
    return ProjectFormCommandMode.字符串
}

function normalizeCommandText(value: string | string[] | undefined) {
    if (typeof value !== "string") return undefined
    return value
}

function normalizeCommandItems(value: string | string[] | undefined) {
    if (!Array.isArray(value)) return undefined
    return value.map(item => String(item))
}

function cleanString(value?: string) {
    const next = value?.trim()
    return next ? next : undefined
}

function normalizeComposeField(value: unknown) {
    if (typeof value !== "string") return undefined
    return cleanString(value)
}

function normalizeFormList(items?: string[]) {
    if (!items) return undefined
    const values = items.map(item => cleanString(item)).filter(isNonNullable)
    return values.length > 0 ? Array.from(new Set(values)) : undefined
}

function normalizeEnvMap(list?: ProjectFormKeyValue[]) {
    if (!list) return undefined

    const pairs = list
        .map(item => ({
            key: cleanString(item.key),
            value: item.value ?? "",
        }))
        .filter(item => item.key)

    if (pairs.length === 0) return undefined

    return pairs.reduce<ComposeEnvironmentMap>((acc, item) => {
        acc[item.key!] = item.value
        return acc
    }, {})
}

function normalizeFormSequence(items?: string[]) {
    if (!items) return undefined
    const values = items.map(item => cleanString(item)).filter(isNonNullable)
    return values.length > 0 ? values : undefined
}

function buildCommandValue({ mode, text, items }: BuildCommandValueParams) {
    if (mode === ProjectFormCommandMode.数组) return normalizeFormSequence(items)

    return cleanString(text)
}

function buildDependsOnValue({ dependsOnItems }: BuildDependsOnValueParams) {
    if (!dependsOnItems) return undefined

    const items = dependsOnItems
        .map(item => ({
            serviceName: cleanString(item.serviceName),
            condition: cleanString(item.condition),
            restart: item.restart,
            required: item.required,
        }))
        .filter(item => item.serviceName)

    if (items.length === 0) return undefined

    const uniqueItems = Array.from(new Map(items.map(item => [item.serviceName!, item])).values())
    const hasLongSyntax = uniqueItems.some(item => isNonNullable(item.condition) || isNonNullable(item.restart) || isNonNullable(item.required))

    if (!hasLongSyntax) return uniqueItems.map(item => item.serviceName!)

    return uniqueItems.reduce<ComposeDependsOnMap>((acc, item) => {
        const config: ComposeDependsOnConfig = {}

        if (isNonNullable(item.condition)) config.condition = item.condition
        if (isNonNullable(item.restart)) config.restart = item.restart
        if (isNonNullable(item.required)) config.required = item.required

        acc[item.serviceName!] = config
        return acc
    }, {})
}

function normalizeServiceItem(item: ProjectFormService, original?: ComposeService) {
    const next = { ...(original ?? {}) } as ComposeService
    const image = cleanString(item.image)
    const containerName = cleanString(item.containerName)

    const command = buildCommandValue({
        mode: item.commandMode,
        text: item.command,
        items: item.commandItems,
    })

    const entrypoint = buildCommandValue({
        mode: item.entrypointMode,
        text: item.entrypoint,
        items: item.entrypointItems,
    })

    const ports = normalizeFormList(item.ports)
    const volumes = normalizeFormList(item.volumes)

    const dependsOn = buildDependsOnValue({
        dependsOnItems: item.dependsOnItems,
    })

    const networks = normalizeFormList(item.networks)
    const environment = normalizeEnvMap(item.environment)

    if (image) next.image = image
    else delete next.image

    if (containerName) next.container_name = containerName
    else delete next.container_name

    if (entrypoint) next.entrypoint = entrypoint
    else delete next.entrypoint

    if (command) next.command = command
    else delete next.command

    if (ports) next.ports = ports
    else delete next.ports

    if (volumes) next.volumes = volumes
    else delete next.volumes

    if (dependsOn) next.depends_on = dependsOn
    else delete next.depends_on

    if (networks) next.networks = networks
    else delete next.networks

    if (environment) next.environment = environment
    else delete next.environment

    if (item.restart) next.restart = item.restart
    else delete next.restart

    return next
}

function buildNamedMap<T extends Record<string, unknown>>(names?: string[], original?: T) {
    const list = normalizeFormList(names)
    if (!list) return undefined

    return list.reduce<Record<string, unknown>>((acc, name) => {
        acc[name] = original?.[name] ?? {}
        return acc
    }, {}) as T
}

function getComposeRest(original?: ComposeFile) {
    if (!original) return {}

    const rest = { ...original }

    delete rest.name
    delete rest[composeNameKey]
    delete rest[composeDescriptionKey]
    delete rest.services
    delete rest.networks
    delete rest.volumes

    return rest
}

export function parseComposeYaml(content: string) {
    const result = parse(content) as ComposeFile | null
    if (!result || typeof result !== "object") throw new Error("解析失败")
    return result
}

export function composeToFormData(compose: ComposeFile) {
    const services = Object.entries(compose.services ?? {}).map(([name, service]) => ({
        name,
        image: service.image,
        containerName: service.container_name,
        ports: normalizeStringArray(service.ports),
        environment: normalizeEnvList(service.environment as ComposeEnvironmentMap | string[] | undefined),
        entrypointMode: normalizeCommandMode(service.entrypoint),
        entrypoint: normalizeCommandText(service.entrypoint),
        entrypointItems: normalizeCommandItems(service.entrypoint),
        volumes: normalizeStringArray(service.volumes),
        commandMode: normalizeCommandMode(service.command),
        command: normalizeCommandText(service.command),
        commandItems: normalizeCommandItems(service.command),
        restart: service.restart as ComposeRestartPolicy | undefined,
        dependsOnItems: normalizeDependsOnItems(service.depends_on),
        networks: normalizeStringArray(service.networks),
    }))

    return {
        name: normalizeComposeField(compose.name),
        xName: normalizeComposeField(compose[composeNameKey]),
        description: normalizeComposeField(compose[composeDescriptionKey]),
        services,
        networks: normalizeKeyList(compose.networks),
        volumes: normalizeKeyList(compose.volumes),
    } as ProjectFormData
}

export function formDataToCompose(form: ProjectFormData, original?: ComposeFile) {
    const nativeComposeName = cleanString(form.name)
    const composeName = cleanString(form.xName)
    const composeDescription = cleanString(form.description)

    const services = (form.services ?? [])
        .map(service => {
            const name = cleanString(service.name)
            if (!name) return null
            return {
                name,
                data: normalizeServiceItem(service, original?.services?.[name]),
            }
        })
        .filter(isNonNullable)
        .reduce<ComposeServiceMap>((acc, item) => {
            acc[item.name] = item.data
            return acc
        }, {})

    const networks = buildNamedMap(form.networks, original?.networks)
    const volumes = buildNamedMap(form.volumes, original?.volumes)

    const next: ComposeFile = {}

    if (nativeComposeName) next.name = nativeComposeName
    if (composeName) next[composeNameKey] = composeName
    if (composeDescription) next[composeDescriptionKey] = composeDescription
    if (Object.keys(services).length > 0) next.services = services
    if (networks) next.networks = networks
    if (volumes) next.volumes = volumes

    Object.assign(next, getComposeRest(original))

    return next
}

export function formDataToYaml(form: ProjectFormData, original?: ComposeFile) {
    const compose = formDataToCompose(form, original)
    const content = stringify(compose, { indent: 4, lineWidth: 0 })
    return content.endsWith("\n") ? content : `${content}\n`
}

export function normalizeComposeProjectContent({ content }: NormalizeComposeProjectContentParams) {
    try {
        const compose = parseComposeYaml(content)
        const composeName = normalizeComposeField(compose[composeNameKey])
        const nativeComposeName = normalizeComposeField(compose.name)
        const composeDescription = normalizeComposeField(compose[composeDescriptionKey])
        const next = { ...compose } as ComposeFile

        if (nativeComposeName) next.name = nativeComposeName
        else delete next.name

        if (composeName) next[composeNameKey] = composeName
        else delete next[composeNameKey]

        if (composeDescription) next[composeDescriptionKey] = composeDescription
        else delete next[composeDescriptionKey]

        const nextContent = stringify(next, { indent: 4, lineWidth: 0 })
        return nextContent.endsWith("\n") ? nextContent : `${nextContent}\n`
    } catch {
        return content
    }
}

export function getComposeXName(content: string) {
    try {
        return normalizeComposeField(parseComposeYaml(content)[composeNameKey])
    } catch {
        return undefined
    }
}

export function getComposeDescription(content: string) {
    try {
        return normalizeComposeField(parseComposeYaml(content)[composeDescriptionKey])
    } catch {
        return undefined
    }
}
