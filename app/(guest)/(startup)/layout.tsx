import type { FC, ReactNode } from "react"

import { Brand } from "@/components/Brand"
import { ThemeSwitcher } from "@/components/ThemeSwitcher"

export interface LayoutProps {
    children?: ReactNode
}

const Layout: FC<LayoutProps> = ({ children }) => (
    <main className="grid min-h-full grid-cols-1 bg-background lg:grid-cols-2">
        <div className="flex min-h-screen flex-col p-5 supports-[min-height:100svh]:min-h-svh sm:p-8">
            <div className="flex items-center justify-between gap-4">
                <Brand />
                <ThemeSwitcher variant="outline" />
            </div>
            <div className="flex flex-auto items-center justify-center py-12">
                <div className="w-full max-w-sm">{children}</div>
            </div>
        </div>
        <div className="hidden bg-[linear-gradient(to_bottom,transparent,rgba(0,0,0,0.1)),url('/login.webp')] bg-cover bg-bottom lg:block" />
    </main>
)

export default Layout
