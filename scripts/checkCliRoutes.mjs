import { readdir, readFile } from "node:fs/promises"
import { join } from "node:path"

const expectedRoutes = new Map([
    ["checkProjectStart.ts", "cli/v1/project/check-start"],
    ["copyDockerImage.ts", "cli/v1/image/copy"],
    ["deleteDockerImage.ts", "cli/v1/image/delete"],
    ["deleteProject.ts", "cli/v1/project/delete"],
    ["getProject.ts", "cli/v1/project/get"],
    ["login.ts", "cli/v1/auth/login"],
    ["pullDockerImage.ts", "cli/v1/image/pull"],
    ["queryDockerContainer.ts", "cli/v1/container/query"],
    ["queryDockerImageDetail.ts", "cli/v1/image/query-detail"],
    ["queryProject.ts", "cli/v1/project/query"],
    ["readComposeProject.ts", "cli/v1/compose/read"],
    ["renameDockerImage.ts", "cli/v1/image/rename"],
    ["runComposeProject.ts", "cli/v1/compose/run"],
    ["runDockerContainer.ts", "cli/v1/container/run"],
    ["runProject.ts", "cli/v1/project/run"],
    ["sendPhoneNumberOtp.ts", "cli/v1/auth/send-phone-number-otp"],
])

const sharedDirectory = join(process.cwd(), "shared")
const filenames = (await readdir(sharedDirectory)).filter(filename => filename.endsWith(".ts"))
const actualRoutes = new Map()

for (const filename of filenames) {
    const source = await readFile(join(sharedDirectory, filename), "utf8")
    const matches = Array.from(source.matchAll(/pathname:\s*"(?<pathname>cli\/v1\/[^"]+)"/gu))

    for (const match of matches) {
        const pathname = match.groups?.pathname

        if (!pathname) continue
        if (actualRoutes.has(pathname)) throw new Error(`CLI 路由重复：${pathname}`)

        actualRoutes.set(pathname, filename)
    }
}

if (actualRoutes.size !== expectedRoutes.size) throw new Error(`CLI 路由数量不正确：期望 ${expectedRoutes.size}，实际 ${actualRoutes.size}`)

for (const [filename, pathname] of expectedRoutes) {
    if (actualRoutes.get(pathname) !== filename) throw new Error(`CLI 路由不匹配：${filename} 应声明 ${pathname}`)
}

console.log(`CLI 路由检查通过，共 ${actualRoutes.size} 条`)
