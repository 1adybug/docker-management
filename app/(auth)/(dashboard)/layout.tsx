import type { FC, ReactNode } from "react"

import { Header } from "@/components/Header"

export interface LayoutProps {
    children?: ReactNode
}

const Layout: FC<LayoutProps> = ({ children }) => (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden">
        <Header />
        <main className="min-h-0 flex-auto overflow-auto">
            <div className="h-full min-w-0">{children}</div>
        </main>
    </div>
)

export default Layout
