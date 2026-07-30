import { readdir, readFile } from "node:fs/promises"
import { join } from "node:path"

const expectedRoutes = new Map([
    ["checkProjectStart.ts", "check-project-start"],
    ["copyDockerImage.ts", "copy-docker-image"],
    ["deleteDockerImage.ts", "delete-docker-image"],
    ["deleteProject.ts", "delete-project"],
    ["getProject.ts", "get-project"],
    ["login.ts", "login"],
    ["pullDockerImage.ts", "pull-docker-image"],
    ["queryCurrentUser.ts", "query-current-user"],
    ["queryDockerContainer.ts", "query-docker-container"],
    ["queryDockerImageDetail.ts", "query-docker-image-detail"],
    ["queryProject.ts", "query-project"],
    ["readComposeProject.ts", "read-compose-project"],
    ["renameDockerImage.ts", "rename-docker-image"],
    ["runComposeProject.ts", "run-compose-project"],
    ["runDockerContainer.ts", "run-docker-container"],
    ["runProject.ts", "run-project"],
    ["sendPhoneNumberOtp.ts", "send-phone-number-otp"],
])

const sharedDirectory = join(process.cwd(), "shared")
const filenames = (await readdir(sharedDirectory)).filter(filename => filename.endsWith(".ts"))
const actualRoutes = new Map()

for (const filename of filenames) {
    const source = await readFile(join(sharedDirectory, filename), "utf8")
    const matches = Array.from(source.matchAll(/pathname:\s*"(?<pathname>[^"]+)"/gu))

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
