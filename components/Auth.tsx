import { FC, ReactNode } from "react"

import { LoginPathname } from "@/constants"

import { getCurrentUser } from "@/server/getCurrentUser"
import { getUrl } from "@/server/getUrl"
import { redirectFromLogin } from "@/server/redirectFromLogin"
import { redirectToLogin } from "@/server/redirectToLogin"

export interface AuthProps {
    children?: ReactNode
}

const Auth: FC<AuthProps> = async ({ children }) => {
    const user = await getCurrentUser()
    const url = await getUrl()
    const { pathname } = new URL(url)
    const isLogin = pathname === LoginPathname
    if ((isLogin && !user) || (!isLogin && user)) return children
    if (isLogin) await redirectFromLogin()
    await redirectToLogin()
}

export default Auth
