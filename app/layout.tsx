import type { FC, ReactNode } from "react"

import type { Metadata } from "next"

import { Registry } from "@/components/Registry"

import "@fontsource-variable/noto-sans-sc/wght.css"

import "./globals.css"

export const metadata: Metadata = {
    title: {
        default: "格数科技",
        template: "%s · 格数科技",
    },
    description: "powered by geshu",
}

export interface RootLayoutProps {
    children?: ReactNode
}

const RootLayout: FC<RootLayoutProps> = ({ children }) => (
    <html lang="zh-CN" suppressHydrationWarning>
        <body>
            <Registry>{children}</Registry>
        </body>
    </html>
)

export default RootLayout
