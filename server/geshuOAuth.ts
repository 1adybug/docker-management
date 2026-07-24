import { createHash } from "node:crypto"

import type { GenericOAuthConfig } from "better-auth/plugins/generic-oauth"

import { DevelopmentUrl, GeshuOAuthProviderId, IsDevelopment } from "@/constants"

import { prisma } from "@/prisma"

import { phoneNumberRegex } from "@/schemas/phoneNumber"

import { getDefaultEmailDomain } from "@/server/getTempEmail"

import { getBooleanFromEnv } from "@/utils/getBooleanFromEnv"

const GeshuOAuthScopes = ["openid", "profile", "phone"] as const

export interface GeshuOAuthProfile {
    sub?: string
    id?: string
    name?: string
    nickname?: string
    preferred_username?: string
    phone_number?: string
    phone_number_verified?: boolean
    email?: string
    email_verified?: boolean
    picture?: string
}

export interface GeshuOAuthMappedUser {
    id: string
    name: string
    email: string
    emailVerified: boolean
    image?: string
    nickname: string
    phoneNumber: string
    phoneNumberVerified: boolean
}

export interface GeshuOAuthLoginStatus {
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

function getConfiguredIssuer() {
    const issuer = getEnv("GESHU_OAUTH_ISSUER")
    if (issuer) return issuer.replace(/\/$/, "")
    if (IsDevelopment) return `${DevelopmentUrl}/api/auth`
    return undefined
}

function getConfiguredClientId() {
    return getEnv("GESHU_OAUTH_CLIENT_ID")
}

function getConfiguredClientSecret() {
    return getEnv("GESHU_OAUTH_CLIENT_SECRET")
}

function getGeshuOAuthDiscoveryUrl(issuer: string) {
    const url = new URL(issuer)
    const pathname = url.pathname.replace(/\/$/, "")

    if (pathname.endsWith("/.well-known/openid-configuration")) return url.toString()

    url.search = ""
    url.hash = ""

    if (pathname === "/api/auth") {
        url.pathname = "/.well-known/openid-configuration"
        return url.toString()
    }

    url.pathname = `${pathname}/.well-known/openid-configuration`
    return url.toString()
}

function getHash(value: string) {
    return createHash("sha256").update(value).digest("hex")
}

function getInternalEmail(subject: string) {
    return `oauth-${getHash(subject)}@${getDefaultEmailDomain()}`
}

function getInternalName(subject: string) {
    return `oauth_${getHash(subject).slice(0, 10)}`
}

function getSubject(profile: GeshuOAuthProfile) {
    const subject = profile.sub || profile.id
    if (!subject) throw new Error("账号平台未返回用户 ID")
    return subject
}

function getPhoneNumber(profile: GeshuOAuthProfile) {
    const phoneNumber = profile.phone_number?.trim()
    if (!phoneNumber || !phoneNumberRegex.test(phoneNumber)) throw new Error("账号平台未返回有效手机号")
    return phoneNumber
}

export function isGeshuOAuthLoginEnabled() {
    return getBooleanEnv("GESHU_OAUTH_LOGIN_ENABLED", true)
}

export function isGeshuOAuthCreateUserEnabled() {
    return getBooleanEnv("GESHU_OAUTH_ALLOW_CREATE_USER", false)
}

export function isGeshuOAuthConfigured() {
    return !!getConfiguredIssuer() && !!getConfiguredClientId() && !!getConfiguredClientSecret()
}

export function getGeshuOAuthLoginStatus(): GeshuOAuthLoginStatus {
    const enabled = isGeshuOAuthLoginEnabled()
    const configured = isGeshuOAuthConfigured()

    return {
        enabled,
        configured,
        ready: enabled && configured,
    }
}

export async function mapGeshuOAuthProfileToUser(profile: GeshuOAuthProfile): Promise<GeshuOAuthMappedUser> {
    const subject = getSubject(profile)
    const phoneNumber = getPhoneNumber(profile)
    const user = await prisma.user.findUnique({ where: { phoneNumber } })
    const fallbackName = getInternalName(subject)
    const nickname = profile.nickname || profile.name || profile.preferred_username || phoneNumber

    return {
        id: subject,
        name: user?.name || fallbackName,
        email: user?.email || profile.email || getInternalEmail(subject),
        emailVerified: profile.email_verified === true,
        image: profile.picture,
        nickname,
        phoneNumber,
        phoneNumberVerified: profile.phone_number_verified !== false,
    }
}

export function getGeshuOAuthConfig(): GenericOAuthConfig[] {
    if (!getGeshuOAuthLoginStatus().ready) return []

    const issuer = getConfiguredIssuer()
    const clientId = getConfiguredClientId()
    const clientSecret = getConfiguredClientSecret()

    if (!issuer || !clientId || !clientSecret) return []

    return [
        {
            providerId: GeshuOAuthProviderId,
            discoveryUrl: getGeshuOAuthDiscoveryUrl(issuer),
            clientId,
            clientSecret,
            scopes: [...GeshuOAuthScopes],
            pkce: true,
            authentication: "basic",
            mapProfileToUser: mapGeshuOAuthProfileToUser,
            overrideUserInfo: true,
            disableSignUp: !isGeshuOAuthCreateUserEnabled(),
        },
    ]
}
