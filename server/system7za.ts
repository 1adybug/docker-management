import { execFile } from "node:child_process"
import { promisify } from "node:util"

import { ClientError } from "@/utils/clientError"

const execFileAsync = promisify(execFile)

export async function ensureSystem7zaAvailable() {
    try {
        await execFileAsync("7za", ["-h"], {
            windowsHide: true,
            maxBuffer: 1024 * 1024,
        })
    } catch (error) {
        throw new ClientError({
            message: "系统 7za 不可用，请先确认当前运行环境 PATH 中存在 7za 命令",
            origin: error,
        })
    }
}
