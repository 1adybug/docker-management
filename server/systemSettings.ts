import { existsSync } from "node:fs"
import { resolve } from "node:path"

import Database from "better-sqlite3"
import { z } from "zod/v4"

import {
    type PublicSystemSetting,
    type PublicSystemSettingGroup,
    type SystemSettingDefinition,
    getSystemSettingDefinition,
    SystemSettingDefinitions,
    SystemSettingGroups,
    SystemSettingKey,
    SystemSettingValueKind,
} from "@/constants/systemSettings"

import { prisma } from "@/prisma"
import { DatabaseUrl } from "@/prisma/databaseUrl"

import { ClientError } from "@/utils/clientError"

export interface SystemSettingValueMap {
    [key: string]: string | undefined
}

export interface GetSystemSettingValueMapParams {
    force?: boolean
}

export interface NormalizeSystemSettingValueParams {
    definition: SystemSettingDefinition
    value: unknown
    currentValue?: string
}

export interface SaveSystemSettingsParams {
    values: Record<string, unknown>
}

export interface CreatePublicSystemSettingParams {
    definition: SystemSettingDefinition
    value: string
}

export interface SyncSystemSettingRow {
    value?: string
}

declare global {
    var __SYSTEM_SETTING_TABLE_READY__: Promise<void> | undefined
    var __SYSTEM_SETTINGS_INITIALIZED__: Promise<void> | undefined
    var __SYSTEM_SETTING_VALUES__: SystemSettingValueMap | undefined
}

const stringSchema = z.coerce.string({ message: "无效的文本" }).trim()

const requiredStringSchema = z.coerce.string({ message: "无效的文本" }).trim().min(1, { message: "不能为空" })

const positiveIntegerSchema = z.coerce.number({ message: "必须是正整数" }).int({ message: "必须是整数" }).min(1, { message: "必须大于 0" })

const durationSchema = z
    .string({ message: "无效的时长" })
    .trim()
    .toLowerCase()
    .regex(/^(\d+)\s*(m|min|minute|minutes|h|hour|hours|d|day|days|w|week|weeks)$/, { message: "格式应类似 365d、24h 或 60m" })

const domainSchema = z
    .string({ message: "无效的域名" })
    .trim()
    .min(1, { message: "域名不能为空" })
    .regex(/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, { message: "域名格式不正确" })

function createSystemSettingTable() {
    return prisma
        .$transaction([
            prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS "SystemSetting" (
                "id" TEXT NOT NULL PRIMARY KEY,
                "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "key" TEXT NOT NULL,
                "value" TEXT NOT NULL
            )
        `),
            prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "SystemSetting_key_key" ON "SystemSetting"("key")`),
        ])
        .then(() => undefined)
}

export function isSecretSystemSetting(definition: SystemSettingDefinition) {
    return definition.kind === SystemSettingValueKind.密钥
}

export function getDefaultSystemSettingValue(definition: SystemSettingDefinition) {
    if (definition.key === SystemSettingKey.全局限流 && process.env.NODE_ENV === "development") return "0"
    return definition.defaultValue
}

export function getInitialSystemSettingValue(definition: SystemSettingDefinition) {
    return normalizeSystemSettingValue({
        definition,
        value: getDefaultSystemSettingValue(definition),
    })
}

export async function ensureSystemSettingTable() {
    globalThis.__SYSTEM_SETTING_TABLE_READY__ ??= createSystemSettingTable()
    await globalThis.__SYSTEM_SETTING_TABLE_READY__
}

export async function ensureSystemSettingsInitialized() {
    await ensureSystemSettingTable()

    globalThis.__SYSTEM_SETTINGS_INITIALIZED__ ??= initializeSystemSettings()

    await globalThis.__SYSTEM_SETTINGS_INITIALIZED__
}

export async function initializeSystemSettings() {
    const records = await prisma.systemSetting.findMany({
        select: {
            key: true,
        },
    })

    const existingKeys = new Set(records.map(record => record.key))
    const missingDefinitions = SystemSettingDefinitions.filter(definition => !existingKeys.has(definition.key))

    await Promise.all(
        missingDefinitions.map(async definition => {
            try {
                await prisma.systemSetting.create({
                    data: {
                        key: definition.key,
                        value: getInitialSystemSettingValue(definition),
                    },
                })
            } catch (error) {
                console.warn(`[system-setting] ${definition.key} 初始化失败，可能已由其他请求完成`, error)
            }
        }),
    )
}

export async function getSystemSettingValueMap({ force = false }: GetSystemSettingValueMapParams = {}) {
    await ensureSystemSettingsInitialized()

    if (!force && globalThis.__SYSTEM_SETTING_VALUES__) return { ...globalThis.__SYSTEM_SETTING_VALUES__ }

    const records = await prisma.systemSetting.findMany({
        select: {
            key: true,
            value: true,
        },
    })

    const values: SystemSettingValueMap = {}

    SystemSettingDefinitions.forEach(definition => void (values[definition.key] = getDefaultSystemSettingValue(definition)))

    records.forEach(record => {
        if (!getSystemSettingDefinition(record.key)) return
        values[record.key] = record.value
    })

    globalThis.__SYSTEM_SETTING_VALUES__ = values

    return { ...values }
}

export function getCachedSystemSettingValue(key: SystemSettingKey) {
    const cachedValue = globalThis.__SYSTEM_SETTING_VALUES__?.[key]
    if (cachedValue !== undefined) return cachedValue

    const value = getSyncSystemSettingValue(key)
    if (value !== undefined) return value

    const definition = getSystemSettingDefinition(key)
    if (!definition) throw new Error(`未知的系统设置: ${key}`)

    return getInitialSystemSettingValue(definition)
}

export async function getSystemSettingValue(key: SystemSettingKey) {
    const values = await getSystemSettingValueMap()
    const value = values[key]
    if (value !== undefined) return value

    const definition = getSystemSettingDefinition(key)
    if (!definition) throw new Error(`未知的系统设置: ${key}`)

    return getDefaultSystemSettingValue(definition)
}

export async function getBooleanSystemSettingValue(key: SystemSettingKey) {
    return normalizeBooleanValue(await getSystemSettingValue(key))
}

export async function queryPublicSystemSettingGroups() {
    const values = await getSystemSettingValueMap()

    const groups: PublicSystemSettingGroup[] = SystemSettingGroups.map(group => ({
        ...group,
        settings: SystemSettingDefinitions.filter(definition => definition.group === group.key).map(definition =>
            createPublicSystemSetting({
                definition,
                value: values[definition.key] ?? getDefaultSystemSettingValue(definition),
            })),
    }))

    return groups
}

export async function saveSystemSettings({ values }: SaveSystemSettingsParams) {
    await ensureSystemSettingsInitialized()

    const currentValues = await getSystemSettingValueMap()

    const operations = SystemSettingDefinitions.map(definition => {
        const inputValue = values[definition.key]
        const currentValue = currentValues[definition.key] ?? getDefaultSystemSettingValue(definition)
        const nextValue =
            inputValue === undefined
                ? currentValue
                : normalizeSystemSettingValue({
                      definition,
                      value: inputValue,
                      currentValue,
                  })

        return prisma.systemSetting.upsert({
            where: {
                key: definition.key,
            },
            update: {
                value: nextValue,
            },
            create: {
                key: definition.key,
                value: nextValue,
            },
        })
    })

    await prisma.$transaction(operations)

    globalThis.__SYSTEM_SETTING_VALUES__ = undefined

    return queryPublicSystemSettingGroups()
}

export function createPublicSystemSetting({ definition, value }: CreatePublicSystemSettingParams): PublicSystemSetting {
    const secret = isSecretSystemSetting(definition)
    const hasValue = !!value.trim()

    return {
        key: definition.key,
        kind: definition.kind,
        label: definition.label,
        description: definition.description,
        ...(secret ? {} : { value }),
        hasValue,
        secret,
        placeholder: secret ? (hasValue ? "已配置，留空则保持不变" : "未配置，输入后保存") : definition.placeholder,
    }
}

export function normalizeSystemSettingValue({ definition, value, currentValue }: NormalizeSystemSettingValueParams) {
    try {
        if (definition.kind === SystemSettingValueKind.密钥) return normalizeSecretValue({ value, currentValue })
        if (definition.kind === SystemSettingValueKind.布尔) return normalizeBooleanValue(value) ? "1" : "0"
        if (definition.kind === SystemSettingValueKind.可选布尔) return normalizeOptionalBooleanValue(value)
        if (definition.kind === SystemSettingValueKind.正整数) return String(positiveIntegerSchema.parse(value))
        if (definition.kind === SystemSettingValueKind.时长) return durationSchema.parse(String(value))
        if (definition.kind === SystemSettingValueKind.域名) return domainSchema.parse(String(value))
        if (definition.kind === SystemSettingValueKind.地址) return normalizeUrlValue(value)

        const schema = definition.required ? requiredStringSchema : stringSchema
        return schema.parse(value)
    } catch (error) {
        throw new ClientError({
            message: `${definition.label}: ${error instanceof Error ? error.message : "配置无效"}`,
            origin: error,
        })
    }
}

export function normalizeSecretValue({ value, currentValue }: Pick<NormalizeSystemSettingValueParams, "value" | "currentValue">) {
    const nextValue = stringSchema.parse(value)
    if (!nextValue) return currentValue ?? ""
    return nextValue
}

export function normalizeOptionalBooleanValue(value: unknown) {
    const stringValue = stringSchema.parse(value)
    if (!stringValue) return ""

    return normalizeBooleanValue(stringValue) ? "1" : "0"
}

export function normalizeBooleanValue(value: unknown) {
    if (typeof value === "boolean") return value
    if (typeof value === "number") return value === 1

    const stringValue = stringSchema.parse(value).toLowerCase()

    if (!stringValue) return false
    if (stringValue === "true" || stringValue === "1" || stringValue === "yes" || stringValue === "on") return true
    if (stringValue === "false" || stringValue === "0" || stringValue === "no" || stringValue === "off") return false

    throw new ClientError(`无效的布尔配置值: ${value}`)
}

export function normalizeUrlValue(value: unknown) {
    const stringValue = stringSchema.parse(value)
    if (!stringValue) return ""

    try {
        const url = new URL(stringValue)
        if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("URL 协议必须是 HTTP 或 HTTPS")

        return url.toString()
    } catch (error) {
        throw new ClientError({
            message: "URL 格式不正确",
            origin: error,
        })
    }
}

export function getSyncSystemSettingValue(key: SystemSettingKey) {
    const definition = getSystemSettingDefinition(key)
    if (!definition) return undefined
    if (!DatabaseUrl.startsWith("file:")) return undefined

    const databasePath = resolve(/* turbopackIgnore: true */ process.cwd(), DatabaseUrl.slice("file:".length))
    if (!existsSync(databasePath)) return undefined

    const database = new Database(databasePath, { readonly: true, fileMustExist: true })

    try {
        const row = database.prepare(`SELECT "value" FROM "SystemSetting" WHERE "key" = ? LIMIT 1`).get(key) as SyncSystemSettingRow | undefined
        return row?.value
    } catch {
        return undefined
    } finally {
        database.close()
    }
}
