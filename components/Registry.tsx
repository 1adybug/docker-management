"use client"

import type { FC, ReactNode } from "react"

import { AntdRegistry } from "@ant-design/nextjs-registry"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ConfigProvider } from "antd"
import type { MessageInstance } from "antd/es/message/interface"
import useMessage from "antd/es/message/useMessage"
import zhCN from "antd/locale/zh_CN"
import dayjs from "dayjs"

import "dayjs/locale/zh-cn"

dayjs.locale("zh-cn")

export interface RegistryProps {
    children?: ReactNode
}

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 0,
        },
        mutations: {
            retry: 0,
        },
    },
})

declare global {
    var message: MessageInstance
}

export const Registry: FC<RegistryProps> = ({ children }) => {
    const [message, context] = useMessage()

    // eslint-disable-next-line
    if (typeof window !== "undefined") globalThis.message = message

    return (
        <QueryClientProvider client={queryClient}>
            <AntdRegistry hashPriority="high" layer>
                <ConfigProvider locale={zhCN} theme={{ token: { fontFamily: "Noto Sans SC Variable" } }}>
                    {context}
                    {children}
                </ConfigProvider>
            </AntdRegistry>
        </QueryClientProvider>
    )
}
