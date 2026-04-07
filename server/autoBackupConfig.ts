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

export interface GetTierDirectoryPathParams {
    backupDirectoryPath: string
    tier: BackupTier
}

export interface GetPositiveIntegerFromEnvParams {
    env?: string
    defaultValue: number
}

export interface GetBackupTierScheduleFromEnvParams {
    everyEnv?: string
    retainEnv?: string
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

export const AutoBackupEnabled = getBooleanFromEnv(process.env.AUTO_BACKUP_ENABLED)

export function getAutoBackupConfig() {
    const dataDirectoryPath = resolve(process.cwd(), "data")
    const backupDirectoryPath = resolve(dataDirectoryPath, "backups")
    const stateFilePath = resolve(backupDirectoryPath, "state.json")
    const lockFilePath = resolve(backupDirectoryPath, "backup.lock")
    const tempDirectoryPath = resolve(backupDirectoryPath, "tmp")

    const config: AutoBackupConfig = {
        enabled: AutoBackupEnabled,
        schedule: getAutoBackupSchedule(),
        logRetentionMs: getLogRetentionMs(process.env.AUTO_BACKUP_LOG_RETENTION),
        s3: getS3BackupConfig(),
        databasePath: getDatabasePath(),
        dataDirectoryPath,
        backupDirectoryPath,
        stateFilePath,
        lockFilePath,
        tempDirectoryPath,
    }

    return config
}

export function getAutoBackupSchedule(env: NodeJS.ProcessEnv = process.env) {
    const schedule: AutoBackupSchedule = {
        hourly: getBackupTierScheduleFromEnv({
            everyEnv: env.AUTO_BACKUP_SCHEDULE_HOURLY_EVERY,
            retainEnv: env.AUTO_BACKUP_SCHEDULE_HOURLY_RETAIN,
            defaultValue: DefaultAutoBackupSchedule.hourly,
        }),
        daily: getBackupTierScheduleFromEnv({
            everyEnv: env.AUTO_BACKUP_SCHEDULE_DAILY_EVERY,
            retainEnv: env.AUTO_BACKUP_SCHEDULE_DAILY_RETAIN,
            defaultValue: DefaultAutoBackupSchedule.daily,
        }),
        weekly: getBackupTierScheduleFromEnv({
            everyEnv: env.AUTO_BACKUP_SCHEDULE_WEEKLY_EVERY,
            retainEnv: env.AUTO_BACKUP_SCHEDULE_WEEKLY_RETAIN,
            defaultValue: DefaultAutoBackupSchedule.weekly,
        }),
        monthly: getBackupTierScheduleFromEnv({
            everyEnv: env.AUTO_BACKUP_SCHEDULE_MONTHLY_EVERY,
            retainEnv: env.AUTO_BACKUP_SCHEDULE_MONTHLY_RETAIN,
            defaultValue: DefaultAutoBackupSchedule.monthly,
        }),
    }

    return schedule
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

export function getS3BackupConfig(env: NodeJS.ProcessEnv = process.env) {
    const endpoint = getNonEmptyString(env.AUTO_BACKUP_S3_ENDPOINT)
    const region = getNonEmptyString(env.AUTO_BACKUP_S3_REGION)
    const bucket = getNonEmptyString(env.AUTO_BACKUP_S3_BUCKET)
    const accessKeyId = getNonEmptyString(env.AUTO_BACKUP_S3_ACCESS_KEY_ID)
    const secretAccessKey = getNonEmptyString(env.AUTO_BACKUP_S3_SECRET_ACCESS_KEY)

    if (!endpoint || !region || !bucket || !accessKeyId || !secretAccessKey) return undefined

    const prefix = getOptionalString(env.AUTO_BACKUP_S3_PREFIX)
    const forcePathStyle = getOptionalBooleanFromEnv(env.AUTO_BACKUP_S3_FORCE_PATH_STYLE)

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
    if (!DatabaseUrl.startsWith("file:")) throw new Error(`当前自动备份仅支持 SQLite 文件数据库，收到的 DATABASE_URL 为: ${DatabaseUrl}`)

    const filePath = DatabaseUrl.slice("file:".length)
    return resolve(process.cwd(), filePath)
}

export function getTierDirectoryPath({ backupDirectoryPath, tier }: GetTierDirectoryPathParams) {
    return resolve(backupDirectoryPath, tier)
}

export function getPositiveIntegerFromEnv({ env, defaultValue }: GetPositiveIntegerFromEnvParams) {
    const value = env?.trim()
    if (!value) return defaultValue

    const number = Number(value)
    if (!Number.isInteger(number) || number <= 0) return defaultValue

    return number
}

export function getBackupTierScheduleFromEnv({ everyEnv, retainEnv, defaultValue }: GetBackupTierScheduleFromEnvParams) {
    const schedule: BackupTierSchedule = {
        every: getPositiveIntegerFromEnv({
            env: everyEnv,
            defaultValue: defaultValue.every,
        }),
        retain: getPositiveIntegerFromEnv({
            env: retainEnv,
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

export function getOptionalBooleanFromEnv(env?: string) {
    if (!env?.trim()) return undefined
    return getBooleanFromEnv(env)
}
