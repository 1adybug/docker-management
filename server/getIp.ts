import { headers } from "next/headers"

import { getIpFromHeaders } from "./getIpFromHeaders"

export async function getIp() {
    const headersList = await headers()
    return getIpFromHeaders(headersList)
}
