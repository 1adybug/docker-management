import { FC } from "react"

import { Metadata } from "next"

import SystemSettingForm from "@/components/SystemSettingForm"

export const metadata: Metadata = {
    title: "系统设置",
}

const Page: FC = () => <SystemSettingForm />

export default Page
