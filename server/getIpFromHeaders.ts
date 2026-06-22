const TrustedClientIpHeader = process.env.TRUSTED_CLIENT_IP_HEADER?.trim().toLowerCase()

function normalizeIp(value?: string | null) {
    const ip = value?.trim().replace(/^::ffff:/, "")
    return ip || undefined
}

function getHeaderIp(headers: Headers, header: string) {
    if (header === "x-forwarded-for") return normalizeIp(headers.get(header)?.split(",").at(0))

    return normalizeIp(headers.get(header))
}

export function getIpFromHeaders(headers: Headers) {
    if (TrustedClientIpHeader) return getHeaderIp(headers, TrustedClientIpHeader)

    return normalizeIp(headers.get("x-client-ip") || headers.get("x-forwarded-for")?.split(",").at(0))
}
