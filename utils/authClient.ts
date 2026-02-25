import { phoneNumberClient } from "better-auth/client/plugins"
import { createAuthClient } from "better-auth/react"

import { IsBrowser, IsDevelopment, NextPublicBetterAuthUrl } from "@/constants"

function getAuthClientBaseUrl() {
    if (IsBrowser) return window.location.origin

    const baseUrl = NextPublicBetterAuthUrl?.trim()

    if (baseUrl) return baseUrl
    if (IsDevelopment) return "http://localhost:3000"
    return undefined
}

const authClientBaseUrl = getAuthClientBaseUrl()

export const authClient = createAuthClient({
    ...(authClientBaseUrl ? { baseURL: authClientBaseUrl } : {}),
    plugins: [phoneNumberClient()],
})
