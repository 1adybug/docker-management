"use client"

import { ComponentProps, FC } from "react"

import { Button } from "antd"
import { clsx, StrictOmit } from "deepsea-tools"
import { usePathname, useRouter } from "next/navigation"

import { User } from "@/prisma/generated/client"

import { isAdmin } from "@/server/isAdmin"

import { authClient } from "@/utils/authClient"

import Brand from "./Brand"
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
        filter: isAdmin,
    },
    {
        href: "/project",
        name: "项目管理",
        filter: isAdmin,
    },
    {
        href: "/image",
        name: "镜像管理",
        filter: isAdmin,
    },
    {
        href: "/user",
        name: "用户管理",
        filter: isAdmin,
    },
    {
        href: "/operation-log",
        name: "操作日志",
        filter: isAdmin,
    },
    {
        href: "/error-log",
        name: "错误日志",
        filter: isAdmin,
    },
]

export interface HeaderProps extends StrictOmit<ComponentProps<"header">, "children"> {}

function isNavActive(pathname: string, href: string) {
    if (href === "/") return pathname === href
    return pathname === href || pathname.startsWith(`${href}/`)
}

const Header: FC<HeaderProps> = ({ className, ...rest }) => {
    const router = useRouter()
    const pathname = usePathname()
    const user = useUser()

    async function signOut() {
        await authClient.signOut({})
        router.refresh()
    }

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
            <div className="flex items-center gap-2">
                <div>{user?.name}</div>
                <Button size="small" color="orange" variant="filled" onClick={signOut}>
                    注销
                </Button>
            </div>
        </header>
    )
}

export default Header
