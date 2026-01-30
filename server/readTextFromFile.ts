import { createReadStream } from "node:fs"

/** 读取文本文件 */
export async function readTextFromFile(path: string) {
    const chunks: Buffer[] = []

    await new Promise<void>((resolve, reject) => {
        const stream = createReadStream(path)

        stream.on("data", chunk => {
            chunks.push(Buffer.from(chunk))
        })

        stream.on("error", reject)
        stream.on("end", () => resolve())
    })

    return Buffer.concat(chunks).toString("utf-8")
}
