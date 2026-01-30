import { cookies } from "next/headers"

import { getCookieKey } from "@/utils/getCookieKey"

import { verify } from "./verify"

export async function getCurrentUserId() {
    const cookieStore = await cookies()
    const token = cookieStore.get(getCookieKey("token"))?.value
    return verify(token)
}
