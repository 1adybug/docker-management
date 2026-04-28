"use client"

import { FC, useEffect } from "react"

import ErrorPage from "@/components/ErrorPage"

const Error: FC = () => {
    useEffect(() => {
        document.title = "服务器错误 · 格数科技"
    }, [])

    return <ErrorPage code={500} title="服务器错误" description="抱歉，服务器似乎打了一个盹..." href="/" link="回到首页" image="/500.webp" />
}

export default Error
