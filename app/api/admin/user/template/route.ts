import { NextResponse } from "next/server"

import { createResponseFn } from "@/server/createResponseFn"
import { createWorkbookResponse } from "@/server/createWorkbookResponse"

import { getUserImportTemplate } from "@/shared/getUserImportTemplate"

export const runtime = "nodejs"

const getUserImportTemplateResponse = createResponseFn(getUserImportTemplate)

export async function GET() {
    const result = await getUserImportTemplateResponse()

    if (!result.success) return NextResponse.json(result, { status: 200 })
    if (!result.data) return NextResponse.json({ success: false, data: undefined, message: "生成模板失败" }, { status: 200 })

    return createWorkbookResponse({
        data: result.data,
        filename: "用户导入模板.xlsx",
    })
}
