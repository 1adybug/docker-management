import { cookies } from "next/headers"

import { getCookieKey } from "@/utils/getCookieKey"
import { redirectToLogin } from "@/utils/redirectToLogin"

export async function logout() {
    const cookieStore = await cookies()
    cookieStore.delete(getCookieKey("token"))
    await redirectToLogin()
}
