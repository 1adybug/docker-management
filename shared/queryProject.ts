import { readdir, stat } from "node:fs/promises"

import { isNonNullable } from "deepsea-tools"

import { ensureProjectRoot } from "@/server/ensureProjectRoot"
import { getProjectComposePath } from "@/server/getProjectPaths"
import { isAdmin } from "@/server/isAdmin"

export interface ProjectSummary {
    name: string
    updatedAt: number
}

export async function queryProject() {
    const root = await ensureProjectRoot()
    const entries = await readdir(root, { withFileTypes: true })

    const results = await Promise.all(
        entries
            .filter(entry => entry.isDirectory())
            .map(async entry => {
                const name = entry.name
                const composePath = getProjectComposePath(name)

                try {
                    const stats = await stat(composePath)
                    return {
                        name,
                        updatedAt: stats.mtimeMs,
                    } as ProjectSummary
                } catch {
                    return null
                }
            }),
    )

    return results.filter(isNonNullable).sort((prev, next) => next.updatedAt - prev.updatedAt)
}

queryProject.filter = isAdmin
