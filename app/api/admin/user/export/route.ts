import { NextResponse } from "next/server"

import { exportUserParser } from "@/schemas/exportUser"

import { createResponseFn } from "@/server/createResponseFn"
import { createWorkbookResponse } from "@/server/createWorkbookResponse"

import { exportUser } from "@/shared/exportUser"

export const runtime = "nodejs"

const exportUserResponse = createResponseFn(exportUser)

function getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : "批量导出失败"
}

async function readRequestBody(request: Request) {
    const text = await request.text()
    if (!text.trim()) return {}

    return JSON.parse(text) as unknown
}

export async function POST(request: Request) {
    try {
        const params = exportUserParser(await readRequestBody(request))
        const result = await exportUserResponse(params)

        if (!result.success) return NextResponse.json(result, { status: 200 })
        if (!result.data) return NextResponse.json({ success: false, data: undefined, message: "批量导出失败" }, { status: 200 })

        return createWorkbookResponse({
            data: result.data,
            filename: "用户列表.xlsx",
        })
    } catch (error) {
        return NextResponse.json(
            {
                success: false,
                data: undefined,
                message: getErrorMessage(error),
            },
            { status: 400 },
        )
    }
}
