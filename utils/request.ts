/* eslint-disable */

import { isJSONArray, isJSONObject } from "es-toolkit"

import { PublicApiUrl } from "@/constants"

function getDefaultBase() {
    if (typeof window !== "undefined" && window.location?.origin) return window.location.origin
    if (PublicApiUrl) return PublicApiUrl
    return undefined
}

function isJsonBody(body: unknown) {
    if (!body) return false
    if (typeof body !== "object") return false
    if (body instanceof ArrayBuffer) return false
    if (ArrayBuffer.isView(body as any)) return false
    if (typeof Blob !== "undefined" && body instanceof Blob) return false
    if (typeof FormData !== "undefined" && body instanceof FormData) return false
    if (typeof URLSearchParams !== "undefined" && body instanceof URLSearchParams) return false
    return true
}

export interface ResponseData<T = any> {
    json: T
    blob: Blob
    text: string
    arrayBuffer: ArrayBuffer
    formData: FormData
    stream: Response
}

export type ResponseType = keyof ResponseData

export interface RequestOptions<T extends ResponseType = "json"> extends Omit<RequestInit, "body" | "method"> {
    method?: "GET" | "POST" | "DELETE" | "HEAD" | "OPTIONS" | "PUT" | "PATCH" | "CONNECT" | "TRACE" | (string & {})
    /**
     * 响应的数据类型，默认 json
     * @default "json"
     */
    type?: T
    base?: string | URL
    body?: BodyInit | Record<string, any> | any[]
    search?: (string | number | boolean)[][] | Record<string, string | number | boolean> | string | URLSearchParams
}

export async function request<T extends any = any, P extends ResponseType = "json">(
    input: string | URL,
    options?: RequestOptions<P>,
): Promise<ResponseData<T>[P]> {
    let { headers, type = "json", body, base, search = {}, method = "POST", ...rest } = options ?? {}
    const defaultBase = getDefaultBase()
    const url = new URL(input, typeof input === "string" ? (base ?? defaultBase) : undefined)

    if (isJSONArray(search)) search = search.map(item => item.map(i => String(i)))
    if (isJSONObject(search)) search = Object.entries(search).map(([key, value]) => [key, String(value)])

    if (url.search) url.search = `${url.search}&${search.toString()}`
    else url.search = search.toString()

    if (type !== "json" && type !== "blob" && type !== "text" && type !== "arrayBuffer" && type !== "formData" && type !== "stream")
        throw new Error(`Invalid response type: ${type}`)

    headers = new Headers(headers)

    if (isJsonBody(body)) {
        headers.set("Content-Type", "application/json")
        method ??= "POST"
        body = JSON.stringify(body as any)
    }

    const response = await fetch(url, { headers, body, method, ...rest } as RequestInit)

    switch (type) {
        case "json":
            const contentType = response.headers.get("content-type") || ""
            const text = await response.text()
            if (!text) throw new Error(`响应体为空(${response.status})`)

            let json: { success?: boolean; data?: unknown; message?: string } | undefined

            if (contentType.includes("application/json") || text.trim().startsWith("{") || text.trim().startsWith("[")) {
                try {
                    json = JSON.parse(text) as { success?: boolean; data?: unknown; message?: string }
                } catch {
                    json = undefined
                }
            }

            if (!json) throw new Error(text)
            if (!json.success) throw new Error(json.message || `请求失败(${response.status})`)
            return json.data as any
        case "blob":
            return (await response.blob()) as any
        case "text":
            return (await response.text()) as any
        case "arrayBuffer":
            return (await response.arrayBuffer()) as any
        case "formData":
            return (await response.formData()) as any
        case "stream":
            return response as any
    }
}
