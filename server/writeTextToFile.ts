import { createWriteStream } from "node:fs"
import { Readable } from "node:stream"
import { pipeline } from "node:stream/promises"

/** 写入文本文件 */
export async function writeTextToFile(path: string, content: string) {
    const readable = Readable.from([content])
    const writable = createWriteStream(path)

    await pipeline(readable, writable)
}
