export const LoginPathname = "/login"

export const GeshuOAuthProviderId = "geshu-oauth"

export const GeshuAgentOAuthProviderId = "geshu-agent-oauth"

export const IsProduction = process.env.NODE_ENV === "production"

export const IsDevelopment = process.env.NODE_ENV === "development"

export const IsBrowser = typeof window !== "undefined" && typeof window.document !== "undefined"

export const IsServer = !IsBrowser

export const DevelopmentPort = process.env.PORT?.trim() || "3000"

export const DevelopmentUrl = `http://localhost:${DevelopmentPort}`

export const CookiePrefix = process.env.COOKIE_PREFIX

export const BetterAuthSecret = process.env.BETTER_AUTH_SECRET

export const BetterAuthUrl = IsDevelopment ? DevelopmentUrl : process.env.BETTER_AUTH_URL

export const NextPublicBetterAuthUrl = IsDevelopment ? DevelopmentUrl : process.env.NEXT_PUBLIC_BETTER_AUTH_URL

export const NextPublicTimeZone = process.env.NEXT_PUBLIC_TIME_ZONE
