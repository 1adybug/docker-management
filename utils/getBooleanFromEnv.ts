export function getBooleanFromEnv(env?: string) {
    if (env === undefined) return false
    env = env.trim().toLowerCase()
    if (!env) return false
    if (env === "false" || env === "0" || env === "no" || env === "off") return false
    return true
}
