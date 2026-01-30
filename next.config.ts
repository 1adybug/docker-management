import { NextConfig } from "next"

const config: NextConfig = {
    output: process.env.NEXT_OUTPUT as "standalone" | "export" | undefined,
}

export default config
