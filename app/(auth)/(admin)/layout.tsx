import { FC, ReactNode } from "react"

import { redirect } from "next/navigation"

import { getCurrentUser } from "@/server/getCurrentUser"

export interface LayoutProps {
    children?: ReactNode
}

const Layout: FC<LayoutProps> = async ({ children }) => {
    const user = await getCurrentUser()
    if (user?.role !== "ADMIN") return redirect("/")
    return children
}

export default Layout
