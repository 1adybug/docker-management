import { FC, ReactNode } from "react"

import { redirect } from "next/navigation"

import { UserRole } from "@/schemas/userRole"

import { getCurrentUser } from "@/server/getCurrentUser"

export interface LayoutProps {
    children?: ReactNode
}

const Layout: FC<LayoutProps> = async ({ children }) => {
    const user = await getCurrentUser()
    if (user?.role !== UserRole.管理员) return redirect("/")
    return children
}

export default Layout
