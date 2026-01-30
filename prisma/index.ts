import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3"
import { PrismaLibSql } from "@prisma/adapter-libsql"

import { DatabaseUrl } from "@/prisma.config"

import { IsBun } from "@/constants"

import { PrismaClient } from "./generated/client"

const adapter = new (IsBun ? PrismaLibSql : PrismaBetterSqlite3)({
    url: DatabaseUrl,
})

function getPrisma() {
    return new PrismaClient({
        adapter,
    })
}

declare global {
    var __PRISMA__: ReturnType<typeof getPrisma>
}

globalThis.__PRISMA__ ??= getPrisma()

export const prisma = globalThis.__PRISMA__
