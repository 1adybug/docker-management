import type { FC, ReactNode } from "react"

import type { Metadata } from "next"

export const metadata: Metadata = {
    title: "用户管理",
}

export interface LayoutProps {
    children?: ReactNode
}

const Layout: FC<LayoutProps> = ({ children }) => children

export default Layout
