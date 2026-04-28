"use client"

import { FC, Fragment } from "react"

import ErrorPage from "@/components/ErrorPage"

const Error: FC = () => (
    <Fragment>
        <title>服务器错误 · 格数科技</title>
        <ErrorPage code={500} title="服务器错误" description="抱歉，服务器似乎打了一个盹..." href="/" link="回到首页" image="/500.webp" />
    </Fragment>
)

export default Error
