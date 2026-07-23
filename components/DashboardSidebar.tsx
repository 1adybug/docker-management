"use client"

import type { FC } from "react"

import {
    type LucideIcon,
    BoxesIcon,
    CircleUserRoundIcon,
    FileClockIcon,
    FolderKanbanIcon,
    HouseIcon,
    ImagesIcon,
    SettingsIcon,
    ShieldAlertIcon,
    UsersIcon,
} from "lucide-react"
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

const dockerNavs: NavItem[] = [
    {
        href: "/project",
        name: "项目管理",
        icon: FolderKanbanIcon,
    },
    {
        href: "/container",
        name: "容器管理",
        icon: BoxesIcon,
    },
    {
        href: "/image",
        name: "镜像管理",
        icon: ImagesIcon,
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
            <SidebarGroupLabel className="rounded-[var(--radius-xl)]">{label}</SidebarGroupLabel>
            <SidebarGroupContent>
                <SidebarMenu>
                    {visibleNavs.map(({ href, icon: Icon, name }) => {
                        const navPathname = getPathnameAndSearchParams(href).pathname
                        const isActive = pathname === navPathname || pathname.startsWith(`${navPathname}/`)

                        return (
                            <SidebarMenuItem key={href}>
                                <SidebarMenuButton asChild className="rounded-[var(--radius-xl)]" isActive={isActive}>
                                    <Link href={href} onClick={onNavigate}>
                                        <Icon />
                                        <span>{name}</span>
                                    </Link>
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
                <SidebarNavGroup label="Docker" navs={dockerNavs} user={user} />
                <SidebarNavGroup label="账户" navs={accountNavs} user={user} />
                <SidebarNavGroup label="系统管理" navs={adminNavs} user={user} />
            </SidebarContent>
            <SidebarFooter className="border-t p-3">
                <div className="flex items-center gap-2 rounded-2xl bg-sidebar-accent/60 p-2">
                    <div className="flex size-9 flex-none items-center justify-center rounded-full bg-primary/10 text-primary">
                        <CircleUserRoundIcon className="size-5" />
                    </div>
                    <div className="min-w-0 flex-auto">
                        <div className="truncate text-sm font-medium">{user.nickname}</div>
                        <div className="truncate text-xs text-muted-foreground">{user.name}</div>
                    </div>
                    <ThemeSwitcher className="flex-none" size="icon-sm" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <Link href="/" className="inline-flex h-8 items-center justify-center gap-1.5 rounded-2xl border bg-background px-3 text-sm hover:bg-muted">
                        <HouseIcon className="size-4" />
                        公开首页
                    </Link>
                    <Logout variant="outline" />
                </div>
            </SidebarFooter>
        </Sidebar>
    )
}
