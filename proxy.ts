import { NextRequest, NextResponse } from "next/server"

export async function proxy(request: NextRequest) {
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set("current-url", request.url)

    return NextResponse.next({
        request: {
            headers: requestHeaders,
        },
    })
}

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
