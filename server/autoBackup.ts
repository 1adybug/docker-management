import { createHash } from "node:crypto"
import { createReadStream, createWriteStream } from "node:fs"
import { mkdir, readdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises"
import { basename, resolve } from "node:path"
import { pipeline } from "node:stream/promises"
import { createGzip } from "node:zlib"

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3"
import Database from "better-sqlite3"

import { prisma } from "@/prisma"

import { AutoBackupConfig, AutoBackupSchedule, BackupTier, getAutoBackupConfig, getTierDirectoryPath } from "./autoBackupConfig"
import { withFileLock } from "./autoBackupFileLock"

export interface BackupState {
    windows?: BackupWindowState
    maintenance?: BackupMaintenanceState
}

export interface BackupWindowState {
    hourly?: string
    daily?: string
    weekly?: string
    monthly?: string
}

export interface BackupMaintenanceState {
    logCleanupWindow?: string
}

export interface BackupFileInfo {
    tier: BackupTier
    fileName: string
    filePath: string
    windowId: string
    createdAt: string
    size: number
    sha256: string
}

export interface BackupManifest extends BackupFileInfo {
    databasePath: string
    durationMs: number
    integrityCheck: string
    uploadedToS3: boolean
    s3Key?: string
}

export interface CleanupLogResult {
    operationLogCount: number
    errorLogCount: number
}

export interface SchedulerHandle {
    timer?: NodeJS.Timeout
    startedAt: string
}

export interface CreateTierBackupParams {
    config: AutoBackupConfig
    tier: BackupTier
    windowId: string
    now: Date
}

export interface CleanupExpiredLogsParams {
    now: Date
    logRetentionMs: number
}

export interface WriteBackupStateParams {
    stateFilePath: string
    state: BackupState
}

export interface GetDueBackupTiersParams {
    now: Date
    state: BackupState
    schedule: AutoBackupSchedule
}

export interface GetWindowIdParams {
    tier: BackupTier
    date: Date
}

export interface IsoWeekInfo {
    year: number
    week: number
}

export interface IsDueByScheduleParams {
    tier: BackupTier
    date: Date
    every: number
}

export interface SqliteIntegrityCheckRow {
    integrity_check?: string
}

export interface WriteBackupManifestParams {
    backupDirectoryPath: string
    manifest: BackupManifest
}

export interface CleanupExpiredBackupsParams {
    backupDirectoryPath: string
    tier: BackupTier
    schedule: AutoBackupSchedule
}

export interface BackupDirectoryFileInfo {
    filePath: string
    name: string
    mtimeMs: number
}

export interface UploadBackupToS3IfNeededParams {
    config: AutoBackupConfig
    backupFileInfo: BackupFileInfo
}

export interface UploadBackupResult {
    uploaded: boolean
    s3Key?: string
}

export interface GetS3ObjectKeyParams {
    config: AutoBackupConfig
    backupFileInfo: BackupFileInfo
}

declare global {
    var __AUTO_BACKUP_SCHEDULER__: SchedulerHandle | undefined
}

export async function startAutoBackupScheduler() {
    if (globalThis.__AUTO_BACKUP_SCHEDULER__) return globalThis.__AUTO_BACKUP_SCHEDULER__

    const config = await getAutoBackupConfig()

    if (!config.enabled) {
        console.log("[auto-backup] 自动备份未开启")
        return undefined
    }

    await ensureBackupDirectories(config)

    const scheduler: SchedulerHandle = {
        startedAt: new Date().toISOString(),
    }

    globalThis.__AUTO_BACKUP_SCHEDULER__ = scheduler

    void runAutoBackupMaintenance().catch(error => {
        console.error("[auto-backup] 首次自动备份执行失败", error)
    })

    scheduler.timer = setInterval(() => {
        void runAutoBackupMaintenance().catch(error => {
            console.error("[auto-backup] 自动备份执行失败", error)
        })
    }, 60 * 1000)

    console.log("[auto-backup] 自动备份调度器已启动")

    return scheduler
}

export function stopAutoBackupScheduler() {
    const scheduler = globalThis.__AUTO_BACKUP_SCHEDULER__
    if (!scheduler) return undefined

    if (scheduler.timer) clearInterval(scheduler.timer)
    globalThis.__AUTO_BACKUP_SCHEDULER__ = undefined

    console.log("[auto-backup] 自动备份调度器已停止")

    return scheduler
}

export async function syncAutoBackupScheduler() {
    const config = await getAutoBackupConfig()

    if (!config.enabled) return stopAutoBackupScheduler()

    return startAutoBackupScheduler()
}

export async function runAutoBackupMaintenance(config?: AutoBackupConfig) {
    config ??= await getAutoBackupConfig()
    if (!config.enabled) return undefined

    return withFileLock({ lockFilePath: config.lockFilePath }, async () => {
        const state = await getBackupState(config.stateFilePath)

        const nextState: BackupState = {
            windows: { ...state.windows },
            maintenance: { ...state.maintenance },
        }

        const now = new Date()

        const dueTiers = getDueBackupTiers({
            now,
            state,
            schedule: config.schedule,
        })

        for (const tier of dueTiers) {
            const windowId = getWindowId({ tier, date: now })
            const manifest = await createTierBackup({
                config,
                tier,
                windowId,
                now,
            })

            nextState.windows ??= {}
            nextState.windows[tier] = windowId

            console.log("[auto-backup] 备份成功", {
                tier,
                fileName: manifest.fileName,
                uploadedToS3: manifest.uploadedToS3,
            })
        }

        const currentDailyWindowId = getWindowId({ tier: BackupTier.每日, date: now })

        if (nextState.maintenance?.logCleanupWindow !== currentDailyWindowId) {
            const cleanupResult = await cleanupExpiredLogs({
                now,
                logRetentionMs: config.logRetentionMs,
            })

            nextState.maintenance ??= {}
            nextState.maintenance.logCleanupWindow = currentDailyWindowId

            console.log("[auto-backup] 日志清理完成", cleanupResult)
        }

        await writeBackupState({
            stateFilePath: config.stateFilePath,
            state: nextState,
        })
    })
}

export async function createTierBackup({ config, tier, windowId, now }: CreateTierBackupParams) {
    const startedAt = Date.now()
    const tierDirectoryPath = getTierDirectoryPath({ backupDirectoryPath: config.backupDirectoryPath, tier })
    const createdAt = now.toISOString()
    const databaseName = basename(config.databasePath, ".db")
    const fileName = `${databaseName}-${tier}-${windowId}.db`
    const filePath = resolve(tierDirectoryPath, fileName)
    const tempFilePath = resolve(config.tempDirectoryPath, `${fileName}.tmp`)

    await mkdir(tierDirectoryPath, { recursive: true })
    await rm(tempFilePath, { force: true })

    const database = new Database(config.databasePath)

    try {
        await database.backup(tempFilePath)
    } finally {
        database.close()
    }

    const integrityCheck = await getSqliteIntegrityCheck(tempFilePath)

    if (integrityCheck.toLowerCase() !== "ok") {
        await rm(tempFilePath, { force: true })
        throw new Error(`SQLite 备份完整性校验失败: ${integrityCheck}`)
    }

    await rename(tempFilePath, filePath)

    const fileStat = await stat(filePath)
    const sha256 = await getFileSha256(filePath)

    const backupFileInfo: BackupFileInfo = {
        tier,
        fileName,
        filePath,
        windowId,
        createdAt,
        size: fileStat.size,
        sha256,
    }

    const uploadResult = await uploadBackupToS3IfNeeded({
        config,
        backupFileInfo,
    })

    const manifest: BackupManifest = {
        ...backupFileInfo,
        databasePath: config.databasePath,
        durationMs: Date.now() - startedAt,
        integrityCheck,
        uploadedToS3: uploadResult.uploaded,
        ...(uploadResult.s3Key ? { s3Key: uploadResult.s3Key } : {}),
    }

    await writeBackupManifest({
        backupDirectoryPath: config.backupDirectoryPath,
        manifest,
    })

    await cleanupExpiredBackups({
        backupDirectoryPath: config.backupDirectoryPath,
        tier,
        schedule: config.schedule,
    })

    return manifest
}

export async function cleanupExpiredLogs({ now, logRetentionMs }: CleanupExpiredLogsParams) {
    const expiredAt = new Date(now.getTime() - logRetentionMs)

    const operationLogResult = await prisma.operationLog.deleteMany({
        where: {
            createdAt: {
                lt: expiredAt,
            },
        },
    })

    const errorLogResult = await prisma.errorLog.deleteMany({
        where: {
            createdAt: {
                lt: expiredAt,
            },
        },
    })

    const result: CleanupLogResult = {
        operationLogCount: operationLogResult.count,
        errorLogCount: errorLogResult.count,
    }

    return result
}

export async function ensureBackupDirectories(config: AutoBackupConfig) {
    await mkdir(config.dataDirectoryPath, { recursive: true })
    await mkdir(config.backupDirectoryPath, { recursive: true })
    await mkdir(config.tempDirectoryPath, { recursive: true })

    await Promise.all(
        Object.values(BackupTier).map(tier => {
            const tierDirectoryPath = getTierDirectoryPath({ backupDirectoryPath: config.backupDirectoryPath, tier })
            return mkdir(tierDirectoryPath, { recursive: true })
        }),
    )
}

export async function getBackupState(stateFilePath: string) {
    try {
        const content = await readFile(stateFilePath, "utf8")
        const state = JSON.parse(content) as BackupState
        return state
    } catch {
        const state: BackupState = {}

        return state
    }
}

export async function writeBackupState({ stateFilePath, state }: WriteBackupStateParams) {
    await writeFile(stateFilePath, JSON.stringify(state, null, 4), "utf8")
}

export function getDueBackupTiers({ now, state, schedule }: GetDueBackupTiersParams) {
    const tiers = Object.values(BackupTier)

    return tiers.filter(tier => {
        // 使用 state.json 记录每个周期是否执行过，避免同一周期内重复备份
        const windowId = getWindowId({ tier, date: now })

        const previousWindowId = state.windows?.[tier]
        if (previousWindowId === windowId) return false

        const tierSchedule = schedule[tier]
        return isDueBySchedule({ tier, date: now, every: tierSchedule.every })
    })
}

export function getWindowId({ tier, date }: GetWindowIdParams) {
    const year = date.getFullYear()
    const month = padNumber(date.getMonth() + 1)
    const day = padNumber(date.getDate())
    const hour = padNumber(date.getHours())

    if (tier === BackupTier.小时) return `${year}-${month}-${day}-${hour}`
    if (tier === BackupTier.每日) return `${year}-${month}-${day}`
    if (tier === BackupTier.每月) return `${year}-${month}`

    const isoWeek = getIsoWeek(date)
    return `${isoWeek.year}-W${padNumber(isoWeek.week)}`
}

export function getIsoWeek(date: Date) {
    const target = new Date(date)
    target.setHours(0, 0, 0, 0)
    target.setDate(target.getDate() + 4 - (target.getDay() || 7))

    const yearStart = new Date(target.getFullYear(), 0, 1)
    const week = Math.ceil(((target.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)

    const info: IsoWeekInfo = {
        year: target.getFullYear(),
        week,
    }

    return info
}

export function isDueBySchedule({ tier, date, every }: IsDueByScheduleParams) {
    if (every <= 1) return true

    if (tier === BackupTier.小时) {
        const serial = Math.floor(date.getTime() / (60 * 60 * 1000))
        return serial % every === 0
    }

    if (tier === BackupTier.每日) {
        const serial = Math.floor(new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() / (24 * 60 * 60 * 1000))
        return serial % every === 0
    }

    if (tier === BackupTier.每周) {
        const isoWeek = getIsoWeek(date)
        const serial = isoWeek.year * 53 + isoWeek.week
        return serial % every === 0
    }

    const serial = date.getFullYear() * 12 + date.getMonth()
    return serial % every === 0
}

export async function getSqliteIntegrityCheck(databasePath: string) {
    const database = new Database(databasePath, { readonly: true })

    try {
        const row = database.prepare("PRAGMA integrity_check").get() as SqliteIntegrityCheckRow
        return row.integrity_check?.trim() || "unknown"
    } finally {
        database.close()
    }
}

export async function getFileSha256(filePath: string) {
    const hash = createHash("sha256")
    await pipeline(createReadStream(filePath), hash)
    return hash.digest("hex")
}

export async function writeBackupManifest({ backupDirectoryPath, manifest }: WriteBackupManifestParams) {
    const manifestsDirectoryPath = resolve(backupDirectoryPath, "manifests")
    await mkdir(manifestsDirectoryPath, { recursive: true })

    const manifestFilePath = resolve(manifestsDirectoryPath, `${manifest.fileName}.json`)
    await writeFile(manifestFilePath, JSON.stringify(manifest, null, 4), "utf8")
}

export async function cleanupExpiredBackups({ backupDirectoryPath, tier, schedule }: CleanupExpiredBackupsParams) {
    const tierDirectoryPath = getTierDirectoryPath({ backupDirectoryPath, tier })
    const dirents = await readdir(tierDirectoryPath, { withFileTypes: true })
    const files = await Promise.all(
        dirents
            .filter(dirent => dirent.isFile() && dirent.name.endsWith(".db"))
            .map(async dirent => {
                const filePath = resolve(tierDirectoryPath, dirent.name)
                const fileStat = await stat(filePath)

                const fileInfo: BackupDirectoryFileInfo = {
                    filePath,
                    name: dirent.name,
                    mtimeMs: fileStat.mtimeMs,
                }

                return fileInfo
            }),
    )

    files.sort((a, b) => b.mtimeMs - a.mtimeMs)

    const maxCount = schedule[tier].retain
    const expiredFiles = files.slice(maxCount)

    await Promise.all(
        expiredFiles.map(async file => {
            await rm(file.filePath, { force: true })
            const manifestFilePath = resolve(backupDirectoryPath, "manifests", `${file.name}.json`)
            await rm(manifestFilePath, { force: true })
        }),
    )
}

export async function uploadBackupToS3IfNeeded({ config, backupFileInfo }: UploadBackupToS3IfNeededParams) {
    if (!config.s3) {
        const result: UploadBackupResult = {
            uploaded: false,
        }

        return result
    }

    const gzipFilePath = resolve(config.tempDirectoryPath, `${backupFileInfo.fileName}.gz`)

    try {
        // 本地保留原始 .db，远端上传压缩包以减少对象存储体积
        await pipeline(createReadStream(backupFileInfo.filePath), createGzip(), createWriteStream(gzipFilePath))

        const client = new S3Client({
            region: config.s3.region,
            endpoint: config.s3.endpoint,
            forcePathStyle: config.s3.forcePathStyle,
            credentials: {
                accessKeyId: config.s3.accessKeyId,
                secretAccessKey: config.s3.secretAccessKey,
            },
        })

        const key = getS3ObjectKey({
            config,
            backupFileInfo,
        })

        await client.send(
            new PutObjectCommand({
                Bucket: config.s3.bucket,
                Key: key,
                Body: createReadStream(gzipFilePath),
                ContentType: "application/gzip",
            }),
        )

        const result: UploadBackupResult = {
            uploaded: true,
            s3Key: key,
        }

        return result
    } finally {
        await rm(gzipFilePath, { force: true })
    }
}

export function getS3ObjectKey({ config, backupFileInfo }: GetS3ObjectKeyParams) {
    const prefix = config.s3?.prefix?.replace(/^\/+|\/+$/g, "")
    const date = backupFileInfo.createdAt.slice(0, 10)
    const parts = [prefix, backupFileInfo.tier, date, `${backupFileInfo.fileName}.gz`].filter(Boolean)
    return parts.join("/")
}

export function padNumber(value: number) {
    return String(value).padStart(2, "0")
}
