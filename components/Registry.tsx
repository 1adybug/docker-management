"use client"

import { FC, ReactNode, useEffect } from "react"

import { AntdRegistry } from "@ant-design/nextjs-registry"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ConfigProvider } from "antd"
import { MessageInstance } from "antd/es/message/interface"
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
            refetchOnWindowFocus: false,
        },
        mutations: {
            retry: 0,
        },
    },
})

declare global {
    var message: MessageInstance
}

const Registry: FC<RegistryProps> = ({ children }) => {
    const [message, context] = useMessage()

    useEffect(() => {
        globalThis.message = message
    }, [message])

    return (
        <QueryClientProvider client={queryClient}>
            <AntdRegistry hashPriority="high">
                <ConfigProvider locale={zhCN} theme={{ token: { fontFamily: "Source Han Sans VF" } }}>
                    {context}
                    {children}
                </ConfigProvider>
            </AntdRegistry>
        </QueryClientProvider>
    )
}

export default Registry
