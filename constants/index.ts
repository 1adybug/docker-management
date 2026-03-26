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

export const defaultEmailDomain = process.env.DEFAULT_EMAIL_DOMAIN

export const BetterAuthSecret = process.env.BETTER_AUTH_SECRET

export const BetterAuthUrl = process.env.BETTER_AUTH_URL

export const NextPublicBetterAuthUrl = process.env.NEXT_PUBLIC_BETTER_AUTH_URL

export const JwtSecrect = process.env.JWT_SECRECT || BetterAuthSecret || ""

export const PublicApiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.PUBLIC_API_URL

export const DockerContainerStatus = {
    运行中: "running",
    已退出: "exited",
    重启中: "restarting",
    已暂停: "paused",
    已创建: "created",
    已失效: "dead",
    其他: "other",
} as const

export type DockerContainerStatus = (typeof DockerContainerStatus)[keyof typeof DockerContainerStatus]

export const AllowCurrentUserUpdateNickname =
    process.env.ALLOW_CURRENT_USER_UPDATE_NICKNAME === undefined ? true : getBooleanFromEnv(process.env.ALLOW_CURRENT_USER_UPDATE_NICKNAME)

export const AllowCurrentUserUpdatePhoneNumber =
    process.env.ALLOW_CURRENT_USER_UPDATE_PHONE_NUMBER === undefined ? true : getBooleanFromEnv(process.env.ALLOW_CURRENT_USER_UPDATE_PHONE_NUMBER)
