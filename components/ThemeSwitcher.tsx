"use client"

import { type ComponentProps, type FC, useEffect, useState } from "react"

import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

export interface ThemeSwitcherProps extends ComponentProps<typeof Button> {}

export const ThemeSwitcher: FC<ThemeSwitcherProps> = ({ type = "button", variant = "ghost", size = "icon", ...rest }) => {
    const { resolvedTheme, setTheme } = useTheme()
    const [mounted, setMounted] = useState(false)

    useEffect(() => setMounted(true), [])

    const ThemeIcon = mounted && resolvedTheme === "dark" ? MoonIcon : SunIcon

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button type={type} variant={variant} size={size} disabled={!mounted} {...rest}>
                    <ThemeIcon />
                    <span className="sr-only">切换主题</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-36" align="end">
                <DropdownMenuItem onClick={() => setTheme("system")}>
                    <MonitorIcon />
                    跟随系统
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("light")}>
                    <SunIcon />
                    浅色
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("dark")}>
                    <MoonIcon />
                    深色
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
