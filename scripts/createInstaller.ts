import { readdir, rm, writeFile } from "node:fs/promises"
import { resolve } from "node:path"

import { spawnAsync, zip } from "soda-nodejs"

const reg = /^--target=(windows|linux)$/

const target = (process.argv.find(item => reg.test(item))?.match(reg)?.[1] ?? "windows") as "windows" | "linux"

await rm("scripts/install.ts", { force: true })

await spawnAsync("bunx prisma generate", { shell: true, stdio: "inherit" })

await spawnAsync("bun run build:standalone", { shell: true, stdio: "inherit" })

const input = await readdir(".next/standalone")

await zip({ input, output: "../standalone.zip", cwd: ".next/standalone" })

const input2 = await readdir(".next/static")

await zip({ input: input2, output: "../static.zip", cwd: ".next/static" })

const input3 = await readdir("public")

await zip({ input: input3, output: "../.next/public.zip", cwd: "public" })

const script = `import { mkdir, readFile, readdir, rename, rm, stat, writeFile } from "fs/promises"
import { join, parse, resolve } from "path"
import { Readable } from "stream"
import { ReadableStream } from "stream/web"
import { styleText } from "util"
import { file } from "bun"
import { unzip } from "soda-nodejs"

import publicPath from "../.next/public.zip" with { type: "file" }
import standalonePath from "../.next/standalone.zip" with { type: "file" }
import staticPath from "../.next/static.zip" with { type: "file" }

${target === "windows" ? `import windowsPath from "../prisma/generated/query_engine-windows.dll.node" with { type: "file" }` : `import debianPath from "../prisma/generated/libquery_engine-debian-openssl-3.0.x.so.node" with { type: "file" }`}

const from = \`${resolve(".").replace(/\\/g, "\\\\")}\`.replace(/[\\\\/]$/, "")
const to = resolve(".").replace(/^[a-zA-Z]+/, m => m.toUpperCase()).replace(/[\\\\/]$/, "")
const from2 = encodeURIComponent(from)
const to2 = encodeURIComponent(to)
const from3 = encodeURIComponent(from + "/")
const to3 = encodeURIComponent(to + "/")
const from4 = encodeURIComponent(from + "\\\\")
const to4 = encodeURIComponent(to + "\\\\")

function escapeRegExp(str: string) {
    return str.replace(/[.*+?^\${}()|[\\]\\\\]/g, "\\\\$&")
}

const reg = new RegExp(
    \`\${escapeRegExp(from.replace(/[\\\\/]/g, "__PLACEHOLDER__")).replace(/__PLACEHOLDER__/g, "\\\\\\\\{0,3}[\\\\\\\\/]")}(\\\\\\\\{0,3}[\\\\\\\\/])?\`,
    "gi",
)

async function replacePath(dir: string) {
    const { name } = parse(dir)
    if (name === "node_modules") return
    const files = await readdir(dir)
    for (const file of files) {
        const path = join(dir, file)
        const status = await stat(path)
        if (status.isDirectory()) {
            await replacePath(path)
        } else {
            if (/\\.([mc]?js|json)$/i.test(path)) {
                const content = await readFile(path, "utf-8")
                const newContent = content
                    .replace(reg, (m, p) => {
                        const prefix = m.match(/(\\\\{0,3})[\\\\/]/)?.[1] ?? ""
                        const split = \`\${prefix}\${m.includes("/") ? "/" : "\\\\"}\`
                        return \`\${to.replace(/[\\\\/]/g, split)}\${p ? split : ""}\`
                    })
                    .replaceAll(from2, to2)
                    .replaceAll(from3, to3)
                    .replaceAll(from4, to4)
                await writeFile(path, newContent)
            }
        }
    }
}

async function main() {
    const publicStream = Readable.fromWeb(file(publicPath).stream() as ReadableStream)
    const standaloneStream = Readable.fromWeb(file(standalonePath).stream() as ReadableStream)
    const staticStream = Readable.fromWeb(file(staticPath).stream() as ReadableStream)
    ${target === "windows" ? `const windowsStream = Readable.fromWeb(file(windowsPath).stream() as ReadableStream)` : `const debianStream = Readable.fromWeb(file(debianPath).stream() as ReadableStream)`}

    await rm(".temp", { recursive: true, force: true })
    await mkdir(".temp", { recursive: true })

    await writeFile(".temp/public.zip", publicStream)
    await writeFile(".temp/standalone.zip", standaloneStream)
    await writeFile(".temp/static.zip", staticStream)

    await unzip({ input: ".temp/public.zip", output: ".temp/public" })
    await unzip({ input: ".temp/standalone.zip", output: ".temp/standalone" })
    await unzip({ input: ".temp/static.zip", output: ".temp/static" })

    const dir = await readdir(".temp/standalone")

    for (const item of dir) {
        await rm(item, { recursive: true, force: true })
        await rename(\`.temp/standalone/\${item}\`, item)
    }

    await rm("public", { recursive: true, force: true })
    await rename(".temp/public", "public")
    await rm(".next/static", { recursive: true, force: true })
    await rename(".temp/static", ".next/static")

    await replacePath(to)

    await mkdir("prisma/generated", { recursive: true })
    await ${target === "windows" ? `writeFile("prisma/generated/query_engine-windows.dll.node", windowsStream)` : `writeFile("prisma/generated/libquery_engine-debian-openssl-3.0.x.so.node", debianStream)`}

    await rm(".temp", { recursive: true, force: true })
    
    console.log(styleText("greenBright", "Task completed, the program will exit in 3 seconds..."))

    setTimeout(() => 0, 3000)
}

main()
`

await writeFile("scripts/install.ts", script)

await spawnAsync(`bun build --compile --target=bun-${target}-x64 --minify --sourcemap --bytecode scripts/install.ts --outfile installer`, {
    shell: true,
    stdio: "inherit",
})

await rm("scripts/install.ts", { force: true })

await rm(".next/standalone.zip", { force: true })

await rm(".next/static.zip", { force: true })

await rm(".next/public.zip", { force: true })
