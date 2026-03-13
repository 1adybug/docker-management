import { getPagination } from "deepsea-tools"

import { prisma } from "@/prisma"

import { defaultPageNum } from "@/schemas/pageNum"
import { defaultPageSize } from "@/schemas/pageSize"
import { queryProjectSchema } from "@/schemas/queryProject"

import { createSharedFn } from "@/server/createSharedFn"

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
    name?: string
    phoneNumber?: string
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

function getOperationUserName({ name, phoneNumber }: GetOperationUserNameParams) {
    const cleanName = name?.trim()
    if (cleanName) return cleanName
    const cleanPhoneNumber = phoneNumber?.trim()
    return cleanPhoneNumber || undefined
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
            name: true,
            phoneNumber: true,
        },
    })

    const map: ProjectUserMap = {}

    for (const log of logs) {
        const name = getProjectNameFromParams(log.params ?? undefined)
        if (!name || !nameSet.has(name)) continue

        const userName = getOperationUserName({
            name: log.name ?? undefined,
            phoneNumber: log.phoneNumber ?? undefined,
        })

        if (!userName) continue

        const current = map[name] ?? {}

        if (log.action === "addProject" && !current.createdUser) current.createdUser = userName
        if (log.action === "updateProject" && !current.updatedUser) current.updatedUser = userName

        map[name] = current
    }

    return map
}

export const queryProject = createSharedFn({
    name: "queryProject",
    schema: queryProjectSchema,
})(async function queryProject({
    id,
    name = "",
    contentKeyword = "",
    createdAfter,
    createdBefore,
    updatedAfter,
    updatedBefore,
    pageNum = defaultPageNum,
    pageSize = defaultPageSize,
} = {}) {
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
})
