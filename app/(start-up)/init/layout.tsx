import { FC, ReactNode } from "react"

import { redirect } from "next/navigation"

import { prisma } from "@/prisma"

export const dynamic = "force-dynamic"

export interface LayoutProps {
    children?: ReactNode
}

const Layout: FC<LayoutProps> = async ({ children }) => {
    const count = await prisma.user.count()
    if (count > 0) return redirect("/")

    return children
}

export default Layout
