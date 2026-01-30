import { FC } from "react"

import ErrorPage from "@/components/ErrorPage"

const NotFound: FC = () => <ErrorPage code={404} title="页面未找到" description="抱歉，你似乎来到了一片无人区..." href="/" link="回到首页" image="/404.webp" />

export default NotFound
