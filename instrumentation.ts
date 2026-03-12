import { cleanupDockerTempDirectories } from "@/server/dockerTempDirectory"

export async function register() {
    await cleanupDockerTempDirectories()
}
