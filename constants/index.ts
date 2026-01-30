export const IsProduction = process.env.NODE_ENV === "production"

export const IsDevelopment = process.env.NODE_ENV === "development"

export const IsBrowser = typeof window !== "undefined" && typeof window.document !== "undefined"

export const IsServer = !IsBrowser

export const PasswordSalt = process.env.PASSWORD_SALT!

export const PublicApiUrl = process.env.PUBLIC_API_URL!

export const LoginPathname = "/login"

export const CookiePrefix = process.env.COOKIE_PREFIX

export const JwtSecrect = process.env.JWT_SECRET!

export const IsIntranet = !!process.env.IS_INTRANET

export const IsBun = typeof Bun !== "undefined"

export const DatabaseUrl = IsDevelopment ? "file:./prisma/development.db" : "file:./prisma/production.db"
