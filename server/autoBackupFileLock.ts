import { mkdir, open, readFile, rm, writeFile } from "node:fs/promises"
import { dirname } from "node:path"

export interface FileLockPayload {
    pid: number
    createdAt: string
}

export interface WithFileLockParams {
    lockFilePath: string
    staleMs?: number
}

export const DefaultFileLockStaleMs = 2 * 60 * 60 * 1000

export async function withFileLock<T>({ lockFilePath, staleMs = DefaultFileLockStaleMs }: WithFileLockParams, fn: () => Promise<T>) {
    await mkdir(dirname(lockFilePath), { recursive: true })

    // 同机多进程场景下，只允许一个实例执行备份与日志清理
    const hasLock = await tryAcquireFileLock({ lockFilePath, staleMs })
    if (!hasLock) return undefined

    try {
        return await fn()
    } finally {
        await rm(lockFilePath, { force: true })
    }
}

export async function tryAcquireFileLock({ lockFilePath, staleMs = DefaultFileLockStaleMs }: WithFileLockParams) {
    try {
        const handle = await open(lockFilePath, "wx")

        const payload: FileLockPayload = {
            pid: process.pid,
            createdAt: new Date().toISOString(),
        }

        await writeFile(handle, JSON.stringify(payload))
        await handle.close()
        return true
    } catch {
        const lockPayload = await getFileLockPayload(lockFilePath)
        if (!lockPayload) return false

        const createdAt = new Date(lockPayload.createdAt).getTime()
        const now = Date.now()
        if (!Number.isFinite(createdAt) || now - createdAt <= staleMs) return false

        await rm(lockFilePath, { force: true })

        try {
            const handle = await open(lockFilePath, "wx")

            const payload: FileLockPayload = {
                pid: process.pid,
                createdAt: new Date().toISOString(),
            }

            await writeFile(handle, JSON.stringify(payload))
            await handle.close()
            return true
        } catch {
            return false
        }
    }
}

export async function getFileLockPayload(lockFilePath: string) {
    try {
        const content = await readFile(lockFilePath, "utf8")
        const payload = JSON.parse(content) as FileLockPayload
        return payload
    } catch {
        return undefined
    }
}
