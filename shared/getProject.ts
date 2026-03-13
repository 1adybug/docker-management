import { prisma } from "@/prisma"

import { getProjectSchema } from "@/schemas/getProject"

import { createSharedFn } from "@/server/createSharedFn"

import { ClientError } from "@/utils/clientError"

export interface ProjectDetail {
    name: string
    content: string
    updatedAt: number
}

export const getProject = createSharedFn({
    name: "getProject",
    schema: getProjectSchema,
})(async function getProject({ name }) {
    const project = await prisma.project.findUnique({ where: { name } })
    if (!project) throw new ClientError("项目不存在")

    return {
        name: project.name,
        content: project.content,
        updatedAt: project.updatedAt.valueOf(),
    } as ProjectDetail
})
