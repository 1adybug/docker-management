import { existsSync } from "node:fs"
import { resolve } from "node:path"

import Database from "better-sqlite3"

const GeshuOAuthProviderId = "geshu-oauth"
const GeshuAgentOAuthProviderId = "geshu-agent-oauth"

function getEnvironment() {
    const index = process.argv.indexOf("--environment")
    const environment = index >= 0 ? process.argv[index + 1] : process.env.NODE_ENV

    if (environment !== "development" && environment !== "production") throw new Error("必须通过 --environment 指定 development 或 production")

    return environment
}

function getEnv(name) {
    return process.env[name]?.trim()
}

function isLocalhost(hostname) {
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1" || hostname === "[::1]"
}

function validateIssuer(value, name, environment) {
    if (value.startsWith("local:oauth:")) return value

    const issuer = new URL(value)

    if (issuer.username || issuer.password || issuer.search || issuer.hash) throw new Error(`${name} 不能包含用户信息、查询参数或片段`)
    if (environment === "production" && issuer.protocol !== "https:") throw new Error(`生产环境的 ${name} 必须使用 HTTPS`)
    if (environment === "development" && issuer.protocol !== "https:" && !(issuer.protocol === "http:" && isLocalhost(issuer.hostname)))
        throw new Error(`开发环境的 ${name} 只允许使用 HTTPS 或 localhost HTTP`)

    return value
}

function getConfiguredIssuerMap(environment) {
    const value = getEnv("BETTER_AUTH_ACCOUNT_ISSUER_MAP")
    if (!value) return {}

    const parsed = JSON.parse(value)
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("BETTER_AUTH_ACCOUNT_ISSUER_MAP 必须是 JSON 对象")

    return Object.fromEntries(
        Object.entries(parsed).map(([providerId, issuer]) => {
            if (!providerId || typeof issuer !== "string" || !issuer.trim()) throw new Error("BETTER_AUTH_ACCOUNT_ISSUER_MAP 包含无效映射")
            return [providerId, validateIssuer(issuer.trim(), `providerId ${providerId} 的 issuer`, environment)]
        }),
    )
}

function getGeshuOAuthDiscoveryUrl(environment) {
    const configured = getEnv("GESHU_OAUTH_ISSUER") || (environment === "development" ? `http://localhost:${getEnv("PORT") || "3000"}/api/auth` : undefined)
    if (!configured) throw new Error("数据库中存在 geshu-oauth 账户，但缺少 GESHU_OAUTH_ISSUER")

    const url = new URL(configured)
    const pathname = url.pathname.replace(/\/$/, "")

    if (pathname.endsWith("/.well-known/openid-configuration")) return url.toString()

    url.search = ""
    url.hash = ""
    url.pathname = pathname === "/api/auth" ? "/.well-known/openid-configuration" : `${pathname}/.well-known/openid-configuration`
    return url.toString()
}

async function discoverGeshuOAuthIssuer(environment) {
    const discoveryUrl = getGeshuOAuthDiscoveryUrl(environment)
    const response = await fetch(discoveryUrl, {
        redirect: "error",
        signal: AbortSignal.timeout(10_000),
    })

    if (!response.ok) throw new Error(`读取 geshu-oauth OpenID Configuration 失败：HTTP ${response.status}`)

    const metadata = await response.json()
    if (!metadata || typeof metadata !== "object" || typeof metadata.issuer !== "string" || !metadata.issuer.trim())
        throw new Error("geshu-oauth OpenID Configuration 缺少 issuer")

    return validateIssuer(metadata.issuer.trim(), "geshu-oauth issuer", environment)
}

function getGeshuAgentOAuthIssuer(environment) {
    const value = getEnv("GESHU_AGENT_OAUTH_ISSUER")
    if (!value) throw new Error("数据库中存在 geshu-agent-oauth 账户，但缺少 GESHU_AGENT_OAUTH_ISSUER")

    const issuer = new URL(validateIssuer(value, "GESHU_AGENT_OAUTH_ISSUER", environment))
    if (issuer.pathname.replace(/\/+$/, "") !== "/api/auth") throw new Error("GESHU_AGENT_OAUTH_ISSUER 必须以 /api/auth 结尾")

    issuer.pathname = "/api/auth"
    return issuer.toString().replace(/\/$/, "")
}

async function resolveIssuer(providerId, configuredIssuerMap, environment) {
    if (configuredIssuerMap[providerId]) return configuredIssuerMap[providerId]
    if (providerId === GeshuOAuthProviderId) return discoverGeshuOAuthIssuer(environment)
    if (providerId === GeshuAgentOAuthProviderId) return getGeshuAgentOAuthIssuer(environment)

    throw new Error(`账户 providerId ${providerId} 缺少可信 issuer 映射，请配置 BETTER_AUTH_ACCOUNT_ISSUER_MAP`)
}

function getTargetAccountIdentity(account, resolvedIssuers) {
    if (account.providerId === "credential") {
        return {
            issuer: "local:credential",
            accountId: account.userId,
        }
    }

    const placeholderIssuer = `local:oauth:${account.providerId}`
    return {
        issuer: account.issuer === placeholderIssuer ? resolvedIssuers.get(account.providerId) || account.issuer : account.issuer,
        accountId: account.accountId,
    }
}

function assertAccountIdentityHasNoCollisions(accounts, resolvedIssuers) {
    const identities = new Map()

    for (const account of accounts) {
        const identity = getTargetAccountIdentity(account, resolvedIssuers)
        if (!identity.issuer || !identity.accountId) throw new Error(`Better Auth 账户 ${account.id} 缺少目标 issuer 或 accountId`)

        const key = JSON.stringify([identity.issuer, identity.accountId])
        const matches = identities.get(key) || []

        matches.push({
            id: account.id,
            providerId: account.providerId,
            userId: account.userId,
        })

        identities.set(key, matches)
    }

    const collisions = [...identities.entries()].filter(([, matches]) => matches.length > 1)
    if (!collisions.length) return

    const details = collisions
        .map(([key, matches]) => {
            const [issuer, accountId] = JSON.parse(key)
            return `${issuer} + ${accountId}: ${matches.map(match => `${match.id}(${match.providerId}, user ${match.userId})`).join(", ")}`
        })
        .join("\n")

    throw new Error(`Better Auth 账户身份存在碰撞，已在写入前停止。请根据可信 Provider 数据人工确认归属，禁止按邮箱合并：\n${details}`)
}

async function main() {
    const environment = getEnvironment()
    const databasePath = resolve("data", environment === "development" ? "development.db" : "production.db")

    if (!existsSync(databasePath)) return

    const database = new Database(databasePath)

    try {
        const columns = database.prepare('PRAGMA table_info("account")').all()
        if (!columns.some(column => column.name === "issuer")) return

        const accounts = database.prepare(`SELECT "id", "issuer", "accountId", "providerId", "userId" FROM "account"`).all()

        const pendingProviders = [
            ...new Set(
                accounts
                    .filter(account => account.providerId !== "credential" && account.issuer === `local:oauth:${account.providerId}`)
                    .map(account => account.providerId),
            ),
        ]

        const configuredIssuerMap = pendingProviders.length ? getConfiguredIssuerMap(environment) : {}
        const resolvedIssuers = new Map()

        for (const providerId of pendingProviders) resolvedIssuers.set(providerId, await resolveIssuer(providerId, configuredIssuerMap, environment))

        assertAccountIdentityHasNoCollisions(accounts, resolvedIssuers)

        const migrateAccountIdentities = database.transaction(() => {
            const credentialResult = database
                .prepare(
                    `UPDATE "account"
                     SET "issuer" = 'local:credential', "accountId" = "userId"
                     WHERE "providerId" = 'credential'
                       AND ("issuer" != 'local:credential' OR "accountId" != "userId")`,
                )
                .run()

            const updateIssuer = database.prepare(
                `UPDATE "account"
             SET "issuer" = ?
             WHERE "providerId" = ?
               AND "issuer" = ?`,
            )

            for (const [providerId, issuer] of resolvedIssuers) updateIssuer.run(issuer, providerId, `local:oauth:${providerId}`)

            return credentialResult.changes
        })

        const credentialChanges = migrateAccountIdentities.immediate()

        if (credentialChanges || resolvedIssuers.size)
            console.log(`已完成 ${credentialChanges} 个 credential 账户标识迁移和 ${resolvedIssuers.size} 个 OAuth issuer 映射`)
    } finally {
        database.close()
    }
}

await main()
