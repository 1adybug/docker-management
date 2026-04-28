import { Metadata } from "next"
import { redirect } from "next/navigation"

export const metadata: Metadata = {
    title: "首页",
}

export default function Page() {
    redirect("/container")
}
