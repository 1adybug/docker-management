import type { FC, ReactNode } from "react"

import type { Metadata } from "next"

export const metadata: Metadata = {
    title: "登录",
}

export interface LayoutProps {
    children?: ReactNode
}

const Layout: FC<LayoutProps> = ({ children }) => children

export default Layout
