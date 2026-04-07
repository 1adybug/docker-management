export function getBooleanFromEnv(env?: string) {
    if (env === undefined) return false
    const value = env.trim().toLowerCase()

    if (!value) return false
    if (value === "true" || value === "1" || value === "yes" || value === "on") return true
    if (value === "false" || value === "0" || value === "no" || value === "off") return false

    throw new Error(`无效的布尔环境变量值: ${env}`)
}
