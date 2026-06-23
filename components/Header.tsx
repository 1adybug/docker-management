"use client"

import type { ComponentProps, FC } from "react"

import { Button } from "antd"
import { type StrictOmit, clsx } from "deepsea-tools"
import { usePathname } from "next/navigation"

import type { User } from "@/prisma/generated/client"

import { isAdmin } from "@/utils/isAdmin"

import Brand from "./Brand"
import Logout from "./Logout"
import { useUser } from "./UserProvider"

export interface NavItem {
    href: string
    name: string
    filter?: (user: User) => boolean
}

const navs: NavItem[] = [
    {
        href: "/container",
        name: "容器管理",
    },
    {
        href: "/project",
        name: "项目管理",
    },
    {
        href: "/image",
        name: "镜像管理",
    },
    {
        href: "/profile",
        name: "个人中心",
    },
    {
        href: "/admin/user",
        name: "用户管理",
        filter: isAdmin,
    },
    {
        href: "/admin/operation-log",
        name: "操作日志",
        filter: isAdmin,
    },
    {
        href: "/admin/error-log",
        name: "错误日志",
        filter: isAdmin,
    },
    {
        href: "/admin/system-setting",
        name: "系统设置",
        filter: isAdmin,
    },
]

export interface HeaderProps extends StrictOmit<ComponentProps<"header">, "children"> {}

function isNavActive(pathname: string, href: string) {
    if (href === "/") return pathname === href
    return pathname === href || pathname.startsWith(`${href}/`)
}

const Header: FC<HeaderProps> = ({ className, ...rest }) => {
    const pathname = usePathname()
    const user = useUser()!

    return (
        <header className={clsx("flex h-16 items-center gap-2 px-4", className)} {...rest}>
            <Brand className="flex-none" />
            <div className="flex flex-auto items-center gap-2">
                {navs.map(
                    ({ href, name, filter }) =>
                        (!filter || filter(user)) && (
                            <Button key={href} type="link" color={isNavActive(pathname, href) ? "primary" : "default"} variant="link" href={href}>
                                {name}
                            </Button>
                        ),
                )}
            </div>
            <div className="flex items-center gap-4">
                <div>{user?.nickname}</div>
                <div className="text-slate-500">{user?.name}</div>
                <Logout size="small" color="orange" variant="filled">
                    注销
                </Logout>
            </div>
        </header>
    )
}

export default Header
