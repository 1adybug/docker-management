import { NextConfig } from "next"

const config: NextConfig = {
    output: process.env.NEXT_OUTPUT as "standalone" | "export" | undefined,
    outputFileTracingIncludes: {
        "/*": ["./node_modules/7zip-bin/**/*", "./node_modules/.pnpm/7zip-bin@*/node_modules/7zip-bin/**/*"],
    },
}

export default config
