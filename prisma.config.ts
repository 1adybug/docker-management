import { defineConfig } from "prisma/config"

import { DatabaseUrl } from "./server/databaseUrl"

export default defineConfig({
    datasource: {
        url: DatabaseUrl,
    },
})
