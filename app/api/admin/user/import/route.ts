import { createNoStoreJsonResponse, createResponseFn } from "@/server/createResponseFn"

import { importUser } from "@/shared/importUser"

export const runtime = "nodejs"

const importUserResponse = createResponseFn(importUser)

function getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : "批量导入失败"
}

export async function POST(request: Request) {
    try {
        const result = await importUserResponse(await request.formData())
        return createNoStoreJsonResponse(result, { status: 200 })
    } catch (error) {
        return createNoStoreJsonResponse(
            {
                success: false,
                data: undefined,
                message: getErrorMessage(error),
            },
            { status: 400 },
        )
    }
}
