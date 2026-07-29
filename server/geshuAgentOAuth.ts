import { createHash } from "node:crypto"

import type { GenericOAuthConfig } from "better-auth/plugins/generic-oauth"

import { GeshuAgentOAuthProviderId, IsDevelopment } from "@/constants"

import { getBooleanFromEnv } from "@/utils/getBooleanFromEnv"

const GeshuAgentOAuthScopes = ["openid", "offline_access"] as const

export interface GeshuAgentOAuthProfile {
    sub?: string
}

export interface GeshuAgentOAuthMappedUser {
    id: string
    name: string
    email: string
    emailVerified: boolean
}

export interface GeshuAgentOAuthLoginStatus {
    enabled: boolean
    configured: boolean
    ready: boolean
}

function getEnv(name: string) {
    return process.env[name]?.trim()
}

function getBooleanEnv(name: string, defaultValue: boolean) {
    const value = getEnv(name)
    if (value === undefined) return defaultValue
    return getBooleanFromEnv(value)
}

function isLocalhost(hostname: string) {
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1" || hostname === "[::1]"
}

function getConfiguredIssuer() {
    const value = getEnv("GESHU_AGENT_OAUTH_ISSUER")
    if (!value) return undefined

    const issuer = new URL(value)

    if (issuer.username || issuer.password || issuer.search || issuer.hash) throw new Error("GESHU_AGENT_OAUTH_ISSUER 不能包含用户信息、查询参数或片段")
    if (issuer.pathname.replace(/\/+$/, "") !== "/api/auth") throw new Error("GESHU_AGENT_OAUTH_ISSUER 必须以 /api/auth 结尾")
    if (!IsDevelopment && issuer.protocol !== "https:") throw new Error("生产环境的 GESHU_AGENT_OAUTH_ISSUER 必须使用 HTTPS")
    if (IsDevelopment && issuer.protocol !== "https:" && !(issuer.protocol === "http:" && isLocalhost(issuer.hostname)))
        throw new Error("开发环境只允许使用 HTTPS 或 localhost HTTP 作为 GESHU_AGENT_OAUTH_ISSUER")

    issuer.pathname = "/api/auth"
    return issuer.toString().replace(/\/$/, "")
}

function getConfiguredClientId() {
    return getEnv("GESHU_AGENT_OAUTH_CLIENT_ID")
}

function getConfiguredClientSecret() {
    return getEnv("GESHU_AGENT_OAUTH_CLIENT_SECRET")
}

function getHash(value: string) {
    return createHash("sha256").update(value).digest("hex")
}

function getSubject(profile: GeshuAgentOAuthProfile) {
    const subject = profile.sub?.trim()
    if (!subject) throw new Error("geshu-agent 未返回标准 sub")
    return subject
}

export function isGeshuAgentOAuthLoginEnabled() {
    return getBooleanEnv("GESHU_AGENT_OAUTH_LOGIN_ENABLED", false)
}

export function isGeshuAgentOAuthConfigured() {
    return !!getConfiguredIssuer() && !!getConfiguredClientId() && !!getConfiguredClientSecret()
}

export function getGeshuAgentOAuthLoginStatus(): GeshuAgentOAuthLoginStatus {
    const enabled = isGeshuAgentOAuthLoginEnabled()

    if (!enabled) {
        return {
            enabled,
            configured: false,
            ready: false,
        }
    }

    const configured = isGeshuAgentOAuthConfigured()

    return {
        enabled,
        configured,
        ready: configured,
    }
}

export function mapGeshuAgentOAuthProfileToUser(profile: GeshuAgentOAuthProfile): GeshuAgentOAuthMappedUser {
    const subject = getSubject(profile)
    const hash = getHash(subject)

    return {
        id: subject,
        name: `geshu_agent_${hash.slice(0, 10)}`,
        email: `geshu-agent-${hash}@oauth.invalid`,
        emailVerified: false,
    }
}

export function getGeshuAgentOAuthConfig(): GenericOAuthConfig[] {
    if (!getGeshuAgentOAuthLoginStatus().ready) return []

    const issuer = getConfiguredIssuer()
    const clientId = getConfiguredClientId()
    const clientSecret = getConfiguredClientSecret()

    if (!issuer || !clientId || !clientSecret) return []

    return [
        {
            providerId: GeshuAgentOAuthProviderId,
            discoveryUrl: `${issuer}/.well-known/openid-configuration`,
            issuer,
            clientId,
            clientSecret,
            scopes: [...GeshuAgentOAuthScopes],
            pkce: true,
            authentication: "basic",
            mapProfileToUser: mapGeshuAgentOAuthProfileToUser,
            requireIssuerValidation: true,
            overrideUserInfo: false,
            disableSignUp: true,
        },
    ]
}
