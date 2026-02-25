import { getBooleanFromEnv } from "@/utils/getBooleanFromEnv"

export const LoginPathname = "/login"

export const IsProduction = process.env.NODE_ENV === "production"

export const IsDevelopment = process.env.NODE_ENV === "development"

export const IsBrowser = typeof window !== "undefined" && typeof window.document !== "undefined"

export const IsServer = !IsBrowser

export const CookiePrefix = process.env.COOKIE_PREFIX

export const IsIntranet = getBooleanFromEnv(process.env.IS_INTRANET)

export const AliyunAccessKeyId = process.env.ALIYUN_ACCESS_KEY_ID

export const AliyunAccessKeySecret = process.env.ALIYUN_ACCESS_KEY_SECRET

export const QjpSmsUrl = process.env.QJP_SMS_URL

export const IsBun = typeof Bun !== "undefined"

export const defaultEmailDomain = process.env.DEFAULT_EMAIL_DOMAIN

export const BetterAuthSecret = process.env.BETTER_AUTH_SECRET

export const BetterAuthUrl = process.env.BETTER_AUTH_URL

export const AuthBaseUrl = process.env.AUTH_BASE_URL

export const NextPublicBetterAuthUrl = process.env.NEXT_PUBLIC_BETTER_AUTH_URL
