import { startAutoBackupScheduler } from "@/server/autoBackup"
import { cleanupDockerTempDirectories } from "@/server/dockerTempDirectory"

export async function register() {
    if (process.env.NEXT_RUNTIME === "edge") return

    await cleanupDockerTempDirectories()
    await startAutoBackupScheduler()
}
