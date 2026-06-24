import { NextResponse } from "next/server"

import { createResponseFn } from "@/server/createResponseFn"

import { importUser } from "@/shared/importUser"

export const runtime = "nodejs"

const importUserResponse = createResponseFn(importUser)

function getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : "批量导入失败"
}

export async function POST(request: Request) {
    try {
        const result = await importUserResponse(await request.formData())
        return NextResponse.json(result, { status: 200 })
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
