import { resolve } from "node:path"

import { SystemSettingKey } from "@/constants/systemSettings"

import { DatabaseUrl } from "@/prisma/databaseUrl"

import { getSystemSettingValueMap, normalizeBooleanValue, SystemSettingValueMap } from "./systemSettings"

export const BackupTier = {
    小时: "hourly",
    每日: "daily",
    每周: "weekly",
    每月: "monthly",
} as const

export type BackupTier = (typeof BackupTier)[keyof typeof BackupTier]

export interface BackupTierSchedule {
    every: number
    retain: number
}

export interface AutoBackupSchedule {
    hourly: BackupTierSchedule
    daily: BackupTierSchedule
    weekly: BackupTierSchedule
    monthly: BackupTierSchedule
}

export interface S3BackupConfig {
    endpoint: string
    region: string
    bucket: string
    accessKeyId: string
    secretAccessKey: string
    prefix?: string
    forcePathStyle?: boolean
}

export interface AutoBackupConfig {
    enabled: boolean
    schedule: AutoBackupSchedule
    logRetentionMs: number
    s3?: S3BackupConfig
    databasePath: string
    dataDirectoryPath: string
    backupDirectoryPath: string
    stateFilePath: string
    lockFilePath: string
    tempDirectoryPath: string
}

export interface GetTierDirectoryPathParams {
    backupDirectoryPath: string
    tier: BackupTier
}

export interface GetPositiveIntegerParams {
    value?: string
    defaultValue: number
}

export interface GetBackupTierScheduleParams {
    everyValue?: string
    retainValue?: string
    defaultValue: BackupTierSchedule
}

export const DefaultAutoBackupSchedule: AutoBackupSchedule = {
    hourly: {
        every: 1,
        retain: 48,
    },
    daily: {
        every: 1,
        retain: 30,
    },
    weekly: {
        every: 1,
        retain: 12,
    },
    monthly: {
        every: 1,
        retain: 12,
    },
}

export const DefaultLogRetentionMs = 365 * 24 * 60 * 60 * 1000

export async function getAutoBackupConfig() {
    const values = await getSystemSettingValueMap()
    const dataDirectoryPath = resolve(/* turbopackIgnore: true */ process.cwd(), "data")
    const backupDirectoryPath = resolve(dataDirectoryPath, "backups")
    const stateFilePath = resolve(backupDirectoryPath, "state.json")
    const lockFilePath = resolve(backupDirectoryPath, "backup.lock")
    const tempDirectoryPath = resolve(backupDirectoryPath, "tmp")

    const config: AutoBackupConfig = {
        enabled: normalizeBooleanValue(values[SystemSettingKey.自动备份]),
        schedule: getAutoBackupSchedule(values),
        logRetentionMs: getLogRetentionMs(values[SystemSettingKey.自动备份日志保留]),
        s3: getS3BackupConfig(values),
        databasePath: getDatabasePath(),
        dataDirectoryPath,
        backupDirectoryPath,
        stateFilePath,
        lockFilePath,
        tempDirectoryPath,
    }

    return config
}

export function getAutoBackupSchedule(values: SystemSettingValueMap = {}) {
    const schedule: AutoBackupSchedule = {
        hourly: getBackupTierSchedule({
            everyValue: values[SystemSettingKey.小时备份周期],
            retainValue: values[SystemSettingKey.小时备份保留数量],
            defaultValue: DefaultAutoBackupSchedule.hourly,
        }),
        daily: getBackupTierSchedule({
            everyValue: values[SystemSettingKey.每日备份周期],
            retainValue: values[SystemSettingKey.每日备份保留数量],
            defaultValue: DefaultAutoBackupSchedule.daily,
        }),
        weekly: getBackupTierSchedule({
            everyValue: values[SystemSettingKey.每周备份周期],
            retainValue: values[SystemSettingKey.每周备份保留数量],
            defaultValue: DefaultAutoBackupSchedule.weekly,
        }),
        monthly: getBackupTierSchedule({
            everyValue: values[SystemSettingKey.每月备份周期],
            retainValue: values[SystemSettingKey.每月备份保留数量],
            defaultValue: DefaultAutoBackupSchedule.monthly,
        }),
    }

    return schedule
}

export function getLogRetentionMs(value?: string) {
    if (!value?.trim()) return DefaultLogRetentionMs

    const match = value
        .trim()
        .toLowerCase()
        .match(/^(\d+)\s*(m|min|minute|minutes|h|hour|hours|d|day|days|w|week|weeks)$/)

    if (!match) return DefaultLogRetentionMs

    const durationValue = Number(match[1])
    if (!Number.isInteger(durationValue) || durationValue <= 0) return DefaultLogRetentionMs

    const unit = match[2]

    if (unit === "m" || unit === "min" || unit === "minute" || unit === "minutes") return durationValue * 60 * 1000
    if (unit === "h" || unit === "hour" || unit === "hours") return durationValue * 60 * 60 * 1000
    if (unit === "d" || unit === "day" || unit === "days") return durationValue * 24 * 60 * 60 * 1000
    if (unit === "w" || unit === "week" || unit === "weeks") return durationValue * 7 * 24 * 60 * 60 * 1000

    return DefaultLogRetentionMs
}

export function getS3BackupConfig(values: SystemSettingValueMap = {}) {
    const endpoint = getNonEmptyString(values[SystemSettingKey.自动备份S3地址])
    const region = getNonEmptyString(values[SystemSettingKey.自动备份S3区域])
    const bucket = getNonEmptyString(values[SystemSettingKey.自动备份S3桶])
    const accessKeyId = getNonEmptyString(values[SystemSettingKey.自动备份S3密钥ID])
    const secretAccessKey = getNonEmptyString(values[SystemSettingKey.自动备份S3密钥Secret])

    if (!endpoint || !region || !bucket || !accessKeyId || !secretAccessKey) return undefined

    const prefix = getOptionalString(values[SystemSettingKey.自动备份S3前缀])
    const forcePathStyle = getOptionalBooleanValue(values[SystemSettingKey.自动备份S3PathStyle])

    const config: S3BackupConfig = {
        endpoint,
        region,
        bucket,
        accessKeyId,
        secretAccessKey,
        ...(prefix ? { prefix } : {}),
        ...(forcePathStyle === undefined ? {} : { forcePathStyle }),
    }

    return config
}

export function getDatabasePath() {
    if (!DatabaseUrl.startsWith("file:")) throw new Error(`当前自动备份仅支持 SQLite 文件数据库，当前数据库地址为: ${DatabaseUrl}`)

    const filePath = DatabaseUrl.slice("file:".length)
    return resolve(/* turbopackIgnore: true */ process.cwd(), filePath)
}

export function getTierDirectoryPath({ backupDirectoryPath, tier }: GetTierDirectoryPathParams) {
    return resolve(backupDirectoryPath, tier)
}

export function getPositiveInteger({ value, defaultValue }: GetPositiveIntegerParams) {
    const nextValue = value?.trim()
    if (!nextValue) return defaultValue

    const number = Number(nextValue)
    if (!Number.isInteger(number) || number <= 0) return defaultValue

    return number
}

export function getBackupTierSchedule({ everyValue, retainValue, defaultValue }: GetBackupTierScheduleParams) {
    const schedule: BackupTierSchedule = {
        every: getPositiveInteger({
            value: everyValue,
            defaultValue: defaultValue.every,
        }),
        retain: getPositiveInteger({
            value: retainValue,
            defaultValue: defaultValue.retain,
        }),
    }

    return schedule
}

export function getNonEmptyString(value: unknown) {
    return typeof value === "string" && value.trim() ? value.trim() : undefined
}

export function getOptionalString(value: unknown) {
    return typeof value === "string" && value.trim() ? value.trim() : undefined
}

export function getOptionalBooleanValue(value?: string) {
    if (!value?.trim()) return undefined
    return normalizeBooleanValue(value)
}
