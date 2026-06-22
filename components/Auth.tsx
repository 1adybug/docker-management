import type { FC, ReactNode } from "react"

import { getCurrentUser } from "@/server/getCurrentUser"
import { redirectFromLogin } from "@/server/redirectFromLogin"
import { redirectToLogin } from "@/server/redirectToLogin"

import UserProvider from "./UserProvider"

export interface AuthProps {
    children?: ReactNode
    mode: "auth" | "guest" | "public"
}

const Auth: FC<AuthProps> = async ({ children, mode }) => {
    const user = await getCurrentUser()

    if (mode === "guest") {
        if (!user) return children
        await redirectFromLogin()
    }

    if (mode === "auth") {
        if (user) return <UserProvider value={user}>{children}</UserProvider>
        await redirectToLogin()
    }

    return <UserProvider value={user}>{children}</UserProvider>
}

export default Auth
