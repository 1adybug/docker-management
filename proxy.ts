import { NextRequest, NextResponse } from "next/server"

export async function proxy(request: NextRequest) {
    // const method = request.method?.toUpperCase()
    // const isSafeMethod = method === "GET" || method === "HEAD"

    // if (!isSafeMethod) return NextResponse.next()

    const requestHeaders = new Headers(request.headers)

    requestHeaders.set("current-url", request.url)

    return NextResponse.next({
        request: {
            headers: requestHeaders,
        },
    })
}

// export const config = {
//     matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
// }
