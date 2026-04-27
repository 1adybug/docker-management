import type { PrismaConfig } from "prisma"

import { DatabaseUrl } from "./prisma/databaseUrl"

const config = {
    datasource: {
        url: DatabaseUrl,
    },
} satisfies PrismaConfig

export default config
