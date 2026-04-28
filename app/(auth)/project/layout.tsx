import { FC, ReactNode } from "react"

import { Metadata } from "next"

export const metadata: Metadata = {
    title: "项目管理",
}

export interface LayoutProps {
    children?: ReactNode
}

const Layout: FC<LayoutProps> = ({ children }) => children

export default Layout
