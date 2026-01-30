export function getIpFromHeaders(headers: Headers) {
    return (headers.get("x-client-ip") || headers.get("x-forwarded-for")?.split(",").at(0))?.trim().replace(/^::ffff:/, "")
}
