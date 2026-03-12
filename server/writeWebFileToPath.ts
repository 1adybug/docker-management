import { createWriteStream } from "node:fs"
import { Readable } from "node:stream"
import { pipeline } from "node:stream/promises"
import { ReadableStream } from "node:stream/web"

export interface WriteWebFileToPathParams {
    /** 上传的文件 */
    file: File
    /** 目标路径 */
    path: string
}

/** 将 Web File 流式写入本地路径 */
export async function writeWebFileToPath({ file, path }: WriteWebFileToPathParams) {
    const readable = Readable.fromWeb(file.stream() as unknown as ReadableStream)
    const writable = createWriteStream(path)

    await pipeline(readable, writable)
}
