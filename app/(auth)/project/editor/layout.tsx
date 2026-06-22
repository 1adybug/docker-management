import type { FC, ReactNode } from "react"

import type { Metadata } from "next"

export const metadata: Metadata = {
    title: "项目编辑",
}

export interface LayoutProps {
    children?: ReactNode
}

const Layout: FC<LayoutProps> = ({ children }) => children

export default Layout
