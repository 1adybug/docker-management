import { prisma } from "@/prisma"

import { GetProjectParams } from "@/schemas/getProject"

import { isAdmin } from "@/server/isAdmin"

import { ClientError } from "@/utils/clientError"

export interface ProjectDetail {
    name: string
    content: string
    updatedAt: number
}

export async function getProject({ name }: GetProjectParams) {
    const project = await prisma.project.findUnique({ where: { name } })
    if (!project) throw new ClientError("项目不存在")

    return {
        name: project.name,
        content: project.content,
        updatedAt: project.updatedAt.valueOf(),
    } as ProjectDetail
}

getProject.filter = isAdmin
