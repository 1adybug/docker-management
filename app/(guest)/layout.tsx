import type { FC, ReactNode } from "react"

import { Auth } from "@/components/Auth"

export interface LayoutProps {
    children?: ReactNode
}

const Layout: FC<LayoutProps> = ({ children }) => <Auth mode="guest">{children}</Auth>

export default Layout
