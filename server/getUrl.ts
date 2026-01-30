import { headers } from "next/headers"

export async function getUrl() {
    const headersList = await headers()
    return headersList.get("current-url")!
}
