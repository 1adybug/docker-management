import type { FC, ReactNode } from "react"

import { DashboardSidebar } from "@/components/DashboardSidebar"
import { ThemeSwitcher } from "@/components/ThemeSwitcher"

import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"

export interface LayoutProps {
    children?: ReactNode
}

const Layout: FC<LayoutProps> = ({ children }) => (
    <SidebarProvider className="h-screen min-h-0 overflow-hidden supports-[height:100dvh]:h-dvh">
        <DashboardSidebar />
        <SidebarInset className="min-h-0 min-w-0 overflow-hidden bg-muted/30 md:peer-data-[variant=inset]:rounded-2xl">
            <header className="flex h-14 flex-none items-center gap-2 border-b bg-background px-3 md:hidden">
                <SidebarTrigger />
                <div className="min-w-0 flex-auto truncate text-sm font-semibold">格数科技项目模板</div>
                <ThemeSwitcher className="h-7 w-7" size="icon" />
            </header>
            <main className="min-h-0 flex-auto overflow-auto">
                <div className="mx-auto min-h-full w-full max-w-[1600px] p-4 sm:p-6">{children}</div>
            </main>
        </SidebarInset>
    </SidebarProvider>
)

export default Layout
