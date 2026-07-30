import { createRemoteJWKSet, jwtVerify } from "jose"

import { GeshuAgentOAuthProviderId, GeshuAgentSkillKey, IsDevelopment } from "@/constants"

import { prisma } from "@/prisma"

import type { User } from "@/prisma/generated/client"

import { getGeshuAgentOAuthClientId, getGeshuAgentOAuthIssuer } from "@/server/geshuAgentOAuth"

interface OpenIdConfiguration {
    issuer?: unknown
    jwks_uri?: unknown
}

interface GeshuAgentSkillAuthorizationConfig {
    audience: string
    clientId: string
    issuer: string
}

let remoteJwkSetPromise: Promise<ReturnType<typeof createRemoteJWKSet>> | undefined

function isLoopback(hostname: string) {
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1" || hostname === "[::1]"
}

function normalizeAuthorizationUrl(value: string, field: string) {
    const url = new URL(value)

    if (url.username || url.password || url.search || url.hash) throw new Error(`${field} 不能包含用户信息、查询参数或片段`)
    if (url.protocol !== "https:" && !(IsDevelopment && url.protocol === "http:" && isLoopback(url.hostname)))
        throw new Error(`${field} 必须使用 HTTPS；仅开发环境的 localhost 可以使用 HTTP`)

    return url.toString().replace(/\/$/, "")
}

function getGeshuAgentSkillAuthorizationConfig(): GeshuAgentSkillAuthorizationConfig | undefined {
    const issuer = getGeshuAgentOAuthIssuer()
    const clientId = getGeshuAgentOAuthClientId()
    const audienceValue = process.env.GESHU_AGENT_SKILL_AUTH_AUDIENCE?.trim()

    if (!issuer || !clientId || !audienceValue) return undefined

    return {
        audience: normalizeAuthorizationUrl(audienceValue, "GESHU_AGENT_SKILL_AUTH_AUDIENCE"),
        clientId,
        issuer,
    }
}

async function queryRemoteJwkSet(config: GeshuAgentSkillAuthorizationConfig) {
    const discoveryUrl = new URL(`${config.issuer}/.well-known/openid-configuration`)
    const response = await fetch(discoveryUrl, {
        headers: {
            Accept: "application/json",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(5_000),
    })

    if (!response.ok) throw new Error(`geshu-agent OpenID Configuration 返回 ${response.status}`)

    const discovery = (await response.json()) as OpenIdConfiguration
    if (discovery.issuer !== config.issuer) throw new Error("geshu-agent OpenID Configuration issuer 不匹配")
    if (typeof discovery.jwks_uri !== "string" || !discovery.jwks_uri.trim()) throw new Error("geshu-agent OpenID Configuration 缺少 jwks_uri")

    const jwksUri = normalizeAuthorizationUrl(discovery.jwks_uri, "geshu-agent jwks_uri")
    return createRemoteJWKSet(new URL(jwksUri), {
        cooldownDuration: 30_000,
        timeoutDuration: 5_000,
    })
}

async function getRemoteJwkSet(config: GeshuAgentSkillAuthorizationConfig) {
    if (!remoteJwkSetPromise) {
        remoteJwkSetPromise = queryRemoteJwkSet(config)
        void remoteJwkSetPromise.catch(() => void (remoteJwkSetPromise = undefined))
    }

    return await remoteJwkSetPromise
}

function queryBearerToken(authorization: string) {
    const match = /^Bearer (?<token>\S+)$/u.exec(authorization.trim())
    const token = match?.groups?.token
    if (!token || token.length > 16 * 1024) return undefined
    return token
}

function hasValidRequiredClaims(payload: Awaited<ReturnType<typeof jwtVerify>>["payload"], config: GeshuAgentSkillAuthorizationConfig) {
    const now = Math.floor(Date.now() / 1000)

    return (
        typeof payload.sub === "string" &&
        Boolean(payload.sub.trim()) &&
        typeof payload.exp === "number" &&
        Number.isInteger(payload.exp) &&
        typeof payload.iat === "number" &&
        Number.isInteger(payload.iat) &&
        payload.iat <= now + 5 &&
        payload.exp > payload.iat &&
        payload.exp - payload.iat <= 5 * 60 + 5 &&
        typeof payload.jti === "string" &&
        Boolean(payload.jti.trim()) &&
        payload.token_use === "skill_access" &&
        payload.client_id === config.clientId &&
        payload.skill_key === GeshuAgentSkillKey
    )
}

async function queryLinkedUser(subject: string): Promise<User | undefined> {
    const account = await prisma.account.findUnique({
        where: {
            providerId_accountId: {
                providerId: GeshuAgentOAuthProviderId,
                accountId: subject,
            },
        },
        include: {
            user: true,
        },
    })

    if (!account?.user || account.user.banned === true) return undefined
    return account.user
}

export async function getGeshuAgentSkillAccessTokenUser(authorization: string): Promise<User | undefined> {
    const token = queryBearerToken(authorization)
    const config = getGeshuAgentSkillAuthorizationConfig()
    if (!token || !config) return undefined

    try {
        const remoteJwkSet = await getRemoteJwkSet(config)
        const result = await jwtVerify(token, remoteJwkSet, {
            algorithms: ["RS256"],
            audience: config.audience,
            issuer: config.issuer,
        })

        if (!hasValidRequiredClaims(result.payload, config)) return undefined
        return await queryLinkedUser(result.payload.sub as string)
    } catch (error) {
        console.warn("验证 geshu-agent Skill 访问令牌失败", error instanceof Error ? error.message : String(error))
        return undefined
    }
}
