import { getPagination } from "deepsea-tools"

import { prisma } from "@/prisma"

import { defaultPageNum } from "@/schemas/pageNum"
import { defaultPageSize } from "@/schemas/pageSize"
import { QueryProjectParams } from "@/schemas/queryProject"

import { isAdmin } from "@/server/isAdmin"

export interface ProjectSummary {
    name: string
    createdAt: number
    updatedAt: number
    createdUser?: string
    updatedUser?: string
}

export interface ProjectUserInfo {
    createdUser?: string
    updatedUser?: string
}

export interface ProjectUserMap {
    [key: string]: ProjectUserInfo
}

export interface ProjectActionParams {
    name?: string
}

export interface GetProjectUserMapParams {
    names: string[]
}

export interface GetOperationUserNameParams {
    username?: string
    phone?: string
}

function getProjectNameFromParams(params?: string) {
    if (!params) return undefined

    try {
        const parsed = JSON.parse(params) as ProjectActionParams
        const name = parsed?.name?.trim()
        return name ? name : undefined
    } catch {
        return undefined
    }
}

function getOperationUserName({ username, phone }: GetOperationUserNameParams) {
    const cleanUsername = username?.trim()
    if (cleanUsername) return cleanUsername
    const cleanPhone = phone?.trim()
    return cleanPhone || undefined
}

async function getProjectUserMap({ names }: GetProjectUserMapParams) {
    if (names.length === 0) return {}

    const nameSet = new Set(names)

    const nameFilters = names.map(name => ({
        params: {
            contains: `"name":"${name}"`,
        },
    }))

    const logs = await prisma.operationLog.findMany({
        where: {
            action: {
                in: ["addProject", "updateProject"],
            },
            OR: nameFilters,
        },
        orderBy: {
            createdAt: "desc",
        },
        select: {
            action: true,
            params: true,
            username: true,
            phone: true,
        },
    })

    const map: ProjectUserMap = {}

    for (const log of logs) {
        const name = getProjectNameFromParams(log.params ?? undefined)
        if (!name || !nameSet.has(name)) continue

        const userName = getOperationUserName({
            username: log.username ?? undefined,
            phone: log.phone ?? undefined,
        })

        if (!userName) continue

        const current = map[name] ?? {}

        if (log.action === "addProject" && !current.createdUser) current.createdUser = userName
        if (log.action === "updateProject" && !current.updatedUser) current.updatedUser = userName

        map[name] = current
    }

    return map
}

export async function queryProject({
    id,
    name = "",
    contentKeyword = "",
    createdAfter,
    createdBefore,
    updatedAfter,
    updatedBefore,
    pageNum = defaultPageNum,
    pageSize = defaultPageSize,
}: QueryProjectParams = {}) {
    const projectId = id?.trim() || undefined
    const nameItems = name.split(/\s+/).filter(Boolean)
    const contentItems = contentKeyword.split(/\s+/).filter(Boolean)

    const andFilters = [
        ...nameItems.map(item => ({
            name: {
                contains: item,
            },
        })),
        ...contentItems.map(item => ({
            content: {
                contains: item,
            },
        })),
    ]

    const where = {
        id: projectId,
        updatedAt: {
            gte: updatedAfter,
            lte: updatedBefore,
        },
        createdAt: {
            gte: createdAfter,
            lte: createdBefore,
        },
        AND: andFilters,
    }

    const data = await prisma.project.findMany({
        where,
        skip: (pageNum - 1) * pageSize,
        take: pageSize,
        orderBy: {
            updatedAt: "desc",
        },
        select: {
            name: true,
            createdAt: true,
            updatedAt: true,
        },
    })

    const total = await prisma.project.count({ where })
    const userMap = await getProjectUserMap({ names: data.map(item => item.name) })

    return getPagination({
        data: data.map(item => ({
            name: item.name,
            createdAt: item.createdAt.valueOf(),
            updatedAt: item.updatedAt.valueOf(),
            createdUser: userMap[item.name]?.createdUser,
            updatedUser: userMap[item.name]?.updatedUser,
        })),
        exact: true,
        total,
        pageNum,
        pageSize,
    })
}

queryProject.filter = isAdmin
