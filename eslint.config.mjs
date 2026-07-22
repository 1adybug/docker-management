import { createRequire } from "node:module"

import { defineConfig } from "@1adybug/eslint"

const requireFromSharedConfig = createRequire(import.meta.resolve("@1adybug/eslint"))

const nextCoreWebVitals = requireFromSharedConfig("eslint-config-next/core-web-vitals")
    .filter(config => config.name !== "next/typescript")
    .map(config => {
        if (config.name !== "next") return config

        const { parser, parserOptions, ...languageOptions } = config.languageOptions ?? {}

        return { ...config, languageOptions }
    })

const eslintConfig = [
    {
        ignores: ["components/ui/**", "utils/shadcn.ts"],
    },
    ...defineConfig({
        next: {
            recommended: false,
            extends: nextCoreWebVitals,
        },
        rules: {
            "@typescript-eslint/no-deprecated": "off",
        },
    }),
    {
        files: ["shared/**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}"],
        rules: {
            "prefer-arrow-callback": "off",
        },
    },
]

export default eslintConfig
