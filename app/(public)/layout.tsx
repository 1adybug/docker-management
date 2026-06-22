import type { FC, ReactNode } from "react"

import Auth from "@/components/Auth"

export interface LayoutProps {
    children?: ReactNode
}

const Layout: FC<LayoutProps> = ({ children }) => <Auth mode="public">{children}</Auth>

export default Layout
