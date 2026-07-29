import type { FC, ReactNode } from "react"

import { StartupLayout } from "@/components/StartupLayout"

export interface LayoutProps {
    children?: ReactNode
}

const Layout: FC<LayoutProps> = ({ children }) => <StartupLayout>{children}</StartupLayout>

export default Layout
