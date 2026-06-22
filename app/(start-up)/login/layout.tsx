import type { FC, ReactNode } from "react"

import type { Metadata } from "next"

import Auth from "@/components/Auth"

export const metadata: Metadata = {
    title: "登录",
}

export interface LayoutProps {
    children?: ReactNode
}

const Layout: FC<LayoutProps> = ({ children }) => <Auth>{children}</Auth>

export default Layout
