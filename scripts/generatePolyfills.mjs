// @ts-check

import { mkdir, writeFile } from "node:fs/promises"
import { createRequire } from "node:module"
import path from "node:path"
import { fileURLToPath } from "node:url"

import browserslist from "browserslist"
import compat from "core-js-compat"

const require = createRequire(import.meta.url)
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(scriptDirectory, "..")
const outputDirectory = path.join(projectRoot, "generated")
const outputPath = path.join(outputDirectory, "polyfills.ts")
const targets = browserslist.loadConfig({ path: projectRoot, env: "production" })
const { version } = require("core-js/package.json")

if (!targets) throw new Error("未找到 Browserslist 配置")

const { list } = compat({
    modules: ["core-js/stable"],
    targets,
    version,
})

const modules = [...list].sort()
const content = [
    "// 本文件由 scripts/generatePolyfills.mjs 自动生成，请勿手动修改。",
    ...modules.map(moduleName => `import "core-js/modules/${moduleName}.js"`),
    "",
].join("\n")

await mkdir(outputDirectory, { recursive: true })
await writeFile(outputPath, content, "utf8")

console.log(`已根据 ${targets.join(", ")} 生成 ${modules.length} 个 polyfill 模块。`)
