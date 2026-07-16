import config from "@1adybug/eslint"

const projectConfig = [
    {
        ignores: ["components/ui/**", "utils/shadcn.ts"],
    },
    ...config,
]

export default projectConfig
