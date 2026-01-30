import { isNonNullable } from "deepsea-tools"
import { parse, stringify } from "yaml"

export const ComposeRestartPolicy = {
    不重启: "no",
    总是: "always",
    失败重启: "on-failure",
    除非停止: "unless-stopped",
} as const

export type ComposeRestartPolicy = (typeof ComposeRestartPolicy)[keyof typeof ComposeRestartPolicy]

export interface ComposeEnvironmentMap {
    [key: string]: string
}

export interface ComposeService {
    image?: string
    container_name?: string
    ports?: string[]
    environment?: ComposeEnvironmentMap | string[]
    volumes?: string[]
    command?: string | string[]
    restart?: string
    depends_on?: string[]
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
    services?: ComposeServiceMap
    networks?: ComposeNetworkMap
    volumes?: ComposeVolumeMap
    [key: string]: unknown
}

export interface ProjectFormKeyValue {
    key?: string
    value?: string
}

export interface ProjectFormService {
    name?: string
    image?: string
    containerName?: string
    ports?: string[]
    environment?: ProjectFormKeyValue[]
    volumes?: string[]
    command?: string
    restart?: ComposeRestartPolicy
    dependsOn?: string[]
    networks?: string[]
}

export interface ProjectFormData {
    name?: string
    services?: ProjectFormService[]
    networks?: string[]
    volumes?: string[]
}

export const defaultComposeContent = `services:
    app:
        image: nginx:latest
        ports:
            - "80:80"
`

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

function normalizeCommand(value: string | string[] | undefined) {
    if (!value) return undefined
    if (Array.isArray(value)) return value.join(" ")
    return value
}

function cleanString(value?: string) {
    const next = value?.trim()
    return next ? next : undefined
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

function normalizeServiceItem(item: ProjectFormService, original?: ComposeService) {
    const next = { ...(original ?? {}) } as ComposeService
    const image = cleanString(item.image)
    const containerName = cleanString(item.containerName)
    const command = cleanString(item.command)
    const ports = normalizeFormList(item.ports)
    const volumes = normalizeFormList(item.volumes)
    const dependsOn = normalizeFormList(item.dependsOn)
    const networks = normalizeFormList(item.networks)
    const environment = normalizeEnvMap(item.environment)

    if (image) next.image = image
    else delete next.image

    if (containerName) next.container_name = containerName
    else delete next.container_name

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
        volumes: normalizeStringArray(service.volumes),
        command: normalizeCommand(service.command),
        restart: service.restart as ComposeRestartPolicy | undefined,
        dependsOn: normalizeStringArray(service.depends_on),
        networks: normalizeStringArray(service.networks),
    }))

    return {
        services,
        networks: normalizeKeyList(compose.networks),
        volumes: normalizeKeyList(compose.volumes),
    } as ProjectFormData
}

export function formDataToCompose(form: ProjectFormData, original?: ComposeFile) {
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

    const next: ComposeFile = {
        ...(original ?? {}),
        services: Object.keys(services).length > 0 ? services : undefined,
        networks: buildNamedMap(form.networks, original?.networks),
        volumes: buildNamedMap(form.volumes, original?.volumes),
    }

    if (!next.services) delete next.services
    if (!next.networks) delete next.networks
    if (!next.volumes) delete next.volumes

    return next
}

export function formDataToYaml(form: ProjectFormData, original?: ComposeFile) {
    const compose = formDataToCompose(form, original)
    const content = stringify(compose, { indent: 4, lineWidth: 0 })
    return content.endsWith("\n") ? content : `${content}\n`
}
