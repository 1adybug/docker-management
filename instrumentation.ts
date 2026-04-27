export async function register() {
    if (process.env.NEXT_RUNTIME === "edge") return

    const { cleanupDockerTempDirectories } = await import("@/server/dockerTempDirectory")

    await cleanupDockerTempDirectories()

    const { startAutoBackupScheduler } = await import("@/server/autoBackup")

    await startAutoBackupScheduler()
}
