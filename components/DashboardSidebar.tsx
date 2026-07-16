"use client"

import type { FC } from "react"

import { type LucideIcon, CircleUserRoundIcon, FileClockIcon, HouseIcon, SettingsIcon, ShieldAlertIcon, UsersIcon } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from "@/components/ui/sidebar"

import type { User } from "@/prisma/generated/client"

import { getPathnameAndSearchParams } from "@/utils/getPathnameAndSearchParams"
import { isAdmin } from "@/utils/isAdmin"

import { Brand } from "./Brand"
import { Logout } from "./Logout"
import { ThemeSwitcher } from "./ThemeSwitcher"
import { useUser } from "./UserProvider"

export interface NavItem {
    href: string
    name: string
    icon: LucideIcon
    filter?: (user: User) => boolean
}

const accountNavs: NavItem[] = [
    {
        href: "/profile",
        name: "个人中心",
        icon: CircleUserRoundIcon,
    },
]

const adminNavs: NavItem[] = [
    {
        href: "/admin/user",
        name: "用户管理",
        icon: UsersIcon,
        filter: isAdmin,
    },
    {
        href: "/admin/operation-log",
        name: "操作日志",
        icon: FileClockIcon,
        filter: isAdmin,
    },
    {
        href: "/admin/error-log",
        name: "错误日志",
        icon: ShieldAlertIcon,
        filter: isAdmin,
    },
    {
        href: "/admin/system-setting",
        name: "系统设置",
        icon: SettingsIcon,
        filter: isAdmin,
    },
]

interface SidebarNavGroupProps {
    label: string
    navs: NavItem[]
    user: User
}

const SidebarNavGroup: FC<SidebarNavGroupProps> = ({ label, navs, user }) => {
    const pathname = usePathname()
    const { isMobile, setOpenMobile } = useSidebar()
    const visibleNavs = navs.filter(({ filter }) => !filter || filter(user))

    if (visibleNavs.length === 0) return null

    function onNavigate() {
        if (isMobile) setOpenMobile(false)
    }

    return (
        <SidebarGroup>
            <SidebarGroupLabel>{label}</SidebarGroupLabel>
            <SidebarGroupContent>
                <SidebarMenu>
                    {visibleNavs.map(({ href, icon: Icon, name }) => {
                        const isActive = pathname === getPathnameAndSearchParams(href).pathname

                        return (
                            <SidebarMenuItem key={href}>
                                <SidebarMenuButton render={<Link href={href} onClick={onNavigate} />} isActive={isActive}>
                                    <Icon />
                                    <span>{name}</span>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        )
                    })}
                </SidebarMenu>
            </SidebarGroupContent>
        </SidebarGroup>
    )
}

export const DashboardSidebar: FC = () => {
    const user = useUser()!

    return (
        <Sidebar collapsible="offcanvas">
            <SidebarHeader className="border-b p-4">
                <Brand classNames={{ text: "text-base" }} />
            </SidebarHeader>
            <SidebarContent>
                <SidebarNavGroup label="账户" navs={accountNavs} user={user} />
                <SidebarNavGroup label="系统管理" navs={adminNavs} user={user} />
            </SidebarContent>
            <SidebarFooter className="border-t p-3">
                <div className="bg-sidebar-accent/60 flex items-center gap-2 rounded-2xl p-2">
                    <div className="bg-primary/10 text-primary flex size-9 flex-none items-center justify-center rounded-full">
                        <CircleUserRoundIcon className="size-5" />
                    </div>
                    <div className="min-w-0 flex-auto">
                        <div className="truncate text-sm font-medium">{user.nickname}</div>
                        <div className="text-muted-foreground truncate text-xs">{user.name}</div>
                    </div>
                    <ThemeSwitcher size="icon-sm" className="flex-none" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <Link href="/" className="bg-background hover:bg-muted inline-flex h-8 items-center justify-center gap-1.5 rounded-2xl border px-3 text-sm">
                        <HouseIcon className="size-4" />
                        公开首页
                    </Link>
                    <Logout variant="outline" />
                </div>
            </SidebarFooter>
        </Sidebar>
    )
}
