import { prisma } from "@/prisma"

import { CheckProjectStartResult, checkProjectStartSchema } from "@/schemas/checkProjectStart"

import { createSharedFn } from "@/server/createSharedFn"
import { checkComposeMountPaths } from "@/server/ensureComposeMountPaths"
import { ensureProjectRoot } from "@/server/ensureProjectRoot"
import { getProjectDir } from "@/server/getProjectPaths"

import { ClientError } from "@/utils/clientError"
import { normalizeComposeProjectContent } from "@/utils/compose"

export const checkProjectStart = createSharedFn({
    name: "checkProjectStart",
    schema: checkProjectStartSchema,
})(async function checkProjectStart({ name, mountPathOptions }) {
    await ensureProjectRoot()
    const project = await prisma.project.findUnique({ where: { name } })

    if (!project) throw new ClientError("项目不存在")

    const content = normalizeComposeProjectContent({
        content: project.content,
    })

    const result = await checkComposeMountPaths({
        projectDir: getProjectDir(name),
        content,
        mountPathOptions,
    })

    return result as CheckProjectStartResult
})
