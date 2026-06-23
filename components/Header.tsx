"use client"

import { type ComponentProps, type FC, Fragment, useState } from "react"

import { IconMenu2 } from "@tabler/icons-react"
import { type MenuProps, Button, Drawer, Menu } from "antd"
import { type StrictOmit, clsx } from "deepsea-tools"
import Link from "next/link"
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
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const visibleNavs = navs.filter(({ filter }) => !filter || filter(user))
    const selectedNav = visibleNavs.find(({ href }) => isNavActive(pathname, href))

    function onOpenMenu() {
        setIsMenuOpen(true)
    }

    function onCloseMenu() {
        setIsMenuOpen(false)
    }

    const menuItems: MenuProps["items"] = visibleNavs.map(({ href, name }) => ({
        key: href,
        label: (
            <Link href={href} onClick={onCloseMenu}>
                {name}
            </Link>
        ),
    }))

    return (
        <Fragment>
            <header className={clsx("hidden h-16 flex-none items-center gap-2 border-b border-slate-100 bg-white px-4 md:flex", className)} {...rest}>
                <Brand className="flex-none" />
                <nav className="flex min-w-0 flex-auto items-center gap-2 overflow-x-auto" aria-label="主导航">
                    {visibleNavs.map(({ href, name }) => (
                        <Button
                            key={href}
                            className="flex-none"
                            type="link"
                            color={isNavActive(pathname, href) ? "primary" : "default"}
                            variant="link"
                            href={href}
                        >
                            {name}
                        </Button>
                    ))}
                </nav>
                <div className="ml-auto flex min-w-0 flex-none items-center gap-4">
                    <div className="min-w-0 max-w-40 truncate">{user?.nickname}</div>
                    <div className="max-w-32 truncate text-slate-500">{user?.name}</div>
                    <Logout size="small" color="orange" variant="filled">
                        注销
                    </Logout>
                </div>
            </header>
            <header className={clsx("flex h-14 flex-none items-center gap-3 border-b border-slate-100 bg-white px-3 md:hidden", className)} {...rest}>
                <Button className="flex-none" shape="circle" icon={<IconMenu2 size={18} />} aria-label="打开菜单" onClick={onOpenMenu} />
                <Brand
                    className="flex h-8 min-w-0 flex-auto items-center leading-none"
                    classNames={{ link: "h-8 min-w-0 items-center", logoWrapper: "items-center", text: "truncate text-base leading-none" }}
                />
            </header>
            <Drawer title={<Brand />} className="md:hidden" placement="left" size={280} open={isMenuOpen} closable={false} onClose={onCloseMenu}>
                <div className="flex h-full flex-col">
                    <Menu className="flex-auto border-none" mode="inline" selectedKeys={selectedNav ? [selectedNav.href] : []} items={menuItems} />
                    <div className="flex-none border-t border-slate-100 px-2 pt-4">
                        <div className="truncate px-2 text-sm font-medium">{user?.nickname}</div>
                        <div className="mt-1 truncate px-2 text-sm text-slate-500">{user?.name}</div>
                        <Logout className="mt-4 w-full" color="orange" variant="filled">
                            注销
                        </Logout>
                    </div>
                </div>
            </Drawer>
        </Fragment>
    )
}

export default Header
