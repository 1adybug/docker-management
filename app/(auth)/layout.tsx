import { FC, ReactNode } from "react"

import Auth from "@/components/Auth"
import Header from "@/components/Header"

export interface LayoutProps {
    children?: ReactNode
}

const Layout: FC<LayoutProps> = ({ children }) => (
    <Auth>
        <Header />
        <main className="h-[calc(100vh_-_64px)]">{children}</main>
    </Auth>
)

export default Layout
