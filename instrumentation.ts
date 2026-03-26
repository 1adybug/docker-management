import { startAutoBackupScheduler } from "@/server/autoBackup"

export async function register() {
    if (process.env.NEXT_RUNTIME === "edge") return
    await startAutoBackupScheduler()
}
