import { Readable } from "node:stream"

/** 收集流内容为字符串 */
export async function collectStreamText(stream: Readable | null) {
    if (!stream) return ""
    const chunks: Buffer[] = []

    await new Promise<void>((resolve, reject) => {
        stream.on("data", chunk => {
            chunks.push(Buffer.from(chunk))
        })

        stream.on("error", reject)
        stream.on("end", () => resolve())
    })

    return Buffer.concat(chunks).toString("utf-8")
}
