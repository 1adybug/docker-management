import { headers } from "next/headers"

export async function getUserAgent() {
    const headersList = await headers()
    return headersList.get("user-agent")!
}
