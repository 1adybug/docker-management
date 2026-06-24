export interface CreateWorkbookResponseParams {
    data: Uint8Array
    filename: string
}

function getResponseBody(data: Uint8Array) {
    const body = new ArrayBuffer(data.byteLength)
    new Uint8Array(body).set(data)
    return body
}

export function createWorkbookResponse({ data, filename }: CreateWorkbookResponseParams) {
    return new Response(getResponseBody(data), {
        headers: {
            "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
            "Cache-Control": "no-store",
        },
    })
}
