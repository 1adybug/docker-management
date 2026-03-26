import { resolve } from "node:path"

import { DatabaseUrl } from "@/prisma.config"

import { getBooleanFromEnv } from "@/utils/getBooleanFromEnv"

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

export interface JsonObject {
    [key: string]: unknown
}

export interface GetTierDirectoryPathParams {
    backupDirectoryPath: string
    tier: BackupTier
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

export const AutoBackupEnabled = getBooleanFromEnv(process.env.AUTO_BACKUP_ENABLED)

export function getAutoBackupConfig() {
    const dataDirectoryPath = resolve(process.cwd(), "data")
    const backupDirectoryPath = resolve(dataDirectoryPath, "backups")
    const stateFilePath = resolve(backupDirectoryPath, "state.json")
    const lockFilePath = resolve(backupDirectoryPath, "backup.lock")
    const tempDirectoryPath = resolve(backupDirectoryPath, "tmp")

    const config: AutoBackupConfig = {
        enabled: AutoBackupEnabled,
        schedule: getAutoBackupSchedule(process.env.AUTO_BACKUP_SCHEDULE),
        logRetentionMs: getLogRetentionMs(process.env.AUTO_BACKUP_LOG_RETENTION),
        s3: getS3BackupConfig(process.env.AUTO_BACKUP_S3),
        databasePath: getDatabasePath(),
        dataDirectoryPath,
        backupDirectoryPath,
        stateFilePath,
        lockFilePath,
        tempDirectoryPath,
    }

    return config
}

export function getAutoBackupSchedule(env?: string) {
    if (!env?.trim()) return DefaultAutoBackupSchedule

    try {
        const value = JSON.parse(env) as JsonObject
        if (!isJsonObject(value)) return DefaultAutoBackupSchedule

        const hourly = getBackupTierSchedule(value.hourly)
        const daily = getBackupTierSchedule(value.daily)
        const weekly = getBackupTierSchedule(value.weekly)
        const monthly = getBackupTierSchedule(value.monthly)

        if (!hourly || !daily || !weekly || !monthly) return DefaultAutoBackupSchedule

        const schedule: AutoBackupSchedule = {
            hourly,
            daily,
            weekly,
            monthly,
        }

        return schedule
    } catch {
        return DefaultAutoBackupSchedule
    }
}

export function getLogRetentionMs(env?: string) {
    if (!env?.trim()) return DefaultLogRetentionMs

    const match = env
        .trim()
        .toLowerCase()
        .match(/^(\d+)\s*(m|min|minute|minutes|h|hour|hours|d|day|days|w|week|weeks)$/)

    if (!match) return DefaultLogRetentionMs

    const value = Number(match[1])
    if (!Number.isInteger(value) || value <= 0) return DefaultLogRetentionMs

    const unit = match[2]

    if (unit === "m" || unit === "min" || unit === "minute" || unit === "minutes") return value * 60 * 1000
    if (unit === "h" || unit === "hour" || unit === "hours") return value * 60 * 60 * 1000
    if (unit === "d" || unit === "day" || unit === "days") return value * 24 * 60 * 60 * 1000
    if (unit === "w" || unit === "week" || unit === "weeks") return value * 7 * 24 * 60 * 60 * 1000

    return DefaultLogRetentionMs
}

export function getS3BackupConfig(env?: string) {
    if (!env?.trim()) return undefined

    try {
        const value = JSON.parse(env) as JsonObject
        if (!isJsonObject(value)) return undefined

        const endpoint = getNonEmptyString(value.endpoint)
        const region = getNonEmptyString(value.region)
        const bucket = getNonEmptyString(value.bucket)
        const accessKeyId = getNonEmptyString(value.accessKeyId)
        const secretAccessKey = getNonEmptyString(value.secretAccessKey)

        if (!endpoint || !region || !bucket || !accessKeyId || !secretAccessKey) return undefined

        const prefix = getOptionalString(value.prefix)
        const forcePathStyle = getOptionalBoolean(value.forcePathStyle)

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
    } catch {
        return undefined
    }
}

export function getDatabasePath() {
    if (!DatabaseUrl.startsWith("file:")) throw new Error(`当前自动备份仅支持 SQLite 文件数据库，收到的 DATABASE_URL 为: ${DatabaseUrl}`)

    const filePath = DatabaseUrl.slice("file:".length)
    return resolve(process.cwd(), filePath)
}

export function getTierDirectoryPath({ backupDirectoryPath, tier }: GetTierDirectoryPathParams) {
    return resolve(backupDirectoryPath, tier)
}

export function getBackupTierSchedule(value: unknown) {
    if (typeof value === "number") {
        const retain = getPositiveInteger(value)
        if (!retain) return undefined

        const schedule: BackupTierSchedule = {
            every: 1,
            retain,
        }

        return schedule
    }

    if (!isJsonObject(value)) return undefined

    const every = getPositiveInteger(value.every)
    const retain = getPositiveInteger(value.retain)

    if (!every || !retain) return undefined

    const schedule: BackupTierSchedule = {
        every,
        retain,
    }

    return schedule
}

export function isJsonObject(value: unknown): value is JsonObject {
    return typeof value === "object" && value !== null && !Array.isArray(value)
}

export function getPositiveInteger(value: unknown) {
    return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : undefined
}

export function getNonEmptyString(value: unknown) {
    return typeof value === "string" && value.trim() ? value.trim() : undefined
}

export function getOptionalString(value: unknown) {
    return typeof value === "string" && value.trim() ? value.trim() : undefined
}

export function getOptionalBoolean(value: unknown) {
    return typeof value === "boolean" ? value : undefined
}
