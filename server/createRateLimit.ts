import { User } from "@/prisma/generated/client"

import { getBooleanFromEnv } from "@/utils/getBooleanFromEnv"

import { createMemoryRateLimitStore } from "./createMemoryRateLimitStore"

export { createMemoryRateLimitStore } from "./createMemoryRateLimitStore"
export {
    type CreateRedisRateLimitStoreParams,
    type RedisDeleteValue,
    type RedisGetValue,
    type RedisSetValue,
    type RedisSetValueParams,
    createRedisRateLimitStore,
} from "./createRedisRateLimitStore"

export interface RateLimitState {
    count: number
    resetAt: number
}

export interface SetRateLimitStateParams {
    key: string
    state: RateLimitState
    ttlMs: number
}

export interface RateLimitStore {
    get(key: string): Promise<RateLimitState | undefined>
    set(params: SetRateLimitStateParams): Promise<void>
    delete?(key: string): Promise<void>
}

export interface RateLimitContext {
    action: string
    args: unknown[]
    user?: User
    ip?: string
}

export interface RateLimitOptions {
    limit: number
    windowMs: number
    prefix: string
    message: string
    getKey?: RateLimitKeyResolver
}

export interface RateLimitConfig extends Partial<RateLimitOptions> {
    enabled?: boolean
}

export interface ResolvedRateLimitOptions extends RateLimitOptions {
    enabled: boolean
}

export interface RateLimitCheckResult {
    key: string
    limit: number
    current: number
    remaining: number
    resetAt: number
    allowed: boolean
    message: string
}

export type RateLimitKeyResolver = (context: RateLimitContext) => string | Promise<string>

export interface SetGlobalRateLimitOptionsParams extends Partial<RateLimitOptions> {}

export interface ResolveRateLimitOptionsParams {
    rateLimit?: boolean | RateLimitConfig
}

export interface ResolveRateLimitKeyParams {
    context: RateLimitContext
    options: ResolvedRateLimitOptions
}

export interface CheckRateLimitParams {
    context: RateLimitContext
    rateLimit?: boolean | RateLimitConfig
}

export interface CreateRateLimitParams extends RateLimitConfig {}

const defaultGlobalRateLimitOptions: RateLimitOptions = {
    limit: 120,
    windowMs: 60_000,
    prefix: "server-action",
    message: "操作过于频繁，请稍后再试",
}

let globalRateLimitOptions: RateLimitOptions = { ...defaultGlobalRateLimitOptions }

let globalRateLimitStore: RateLimitStore = createMemoryRateLimitStore()

const rateLimitEnabledEnv = process.env.RATE_LIMIT_ENABLED

let globalRateLimitEnabled = rateLimitEnabledEnv === undefined ? true : getBooleanFromEnv(rateLimitEnabledEnv)

function normalizePositiveInteger(value: number | undefined, fallback: number) {
    if (typeof value !== "number" || !Number.isFinite(value)) return fallback
    const nextValue = Math.floor(value)
    if (nextValue <= 0) return fallback
    return nextValue
}

function normalizeString(value: string | undefined, fallback: string) {
    if (!value) return fallback
    const nextValue = value.trim()
    if (!nextValue) return fallback
    return nextValue
}

export function setGlobalRateLimitStore(store: RateLimitStore) {
    globalRateLimitStore = store
}

export function getGlobalRateLimitStore() {
    return globalRateLimitStore
}

export function setGlobalRateLimitEnabled(enabled: boolean) {
    globalRateLimitEnabled = enabled
}

export function isGlobalRateLimitEnabled() {
    return globalRateLimitEnabled
}

export function createRateLimit<T extends CreateRateLimitParams>(rateLimit: T) {
    return rateLimit
}

export function setGlobalRateLimitOptions(params: SetGlobalRateLimitOptionsParams) {
    globalRateLimitOptions = {
        limit: normalizePositiveInteger(params.limit, globalRateLimitOptions.limit),
        windowMs: normalizePositiveInteger(params.windowMs, globalRateLimitOptions.windowMs),
        prefix: normalizeString(params.prefix, globalRateLimitOptions.prefix),
        message: normalizeString(params.message, globalRateLimitOptions.message),
        getKey: params.getKey ?? globalRateLimitOptions.getKey,
    }
}

export function getGlobalRateLimitOptions() {
    return { ...globalRateLimitOptions }
}

export function resolveRateLimitOptions({ rateLimit }: ResolveRateLimitOptionsParams): ResolvedRateLimitOptions {
    const globalOptions = getGlobalRateLimitOptions()

    if (rateLimit === false) {
        return {
            ...globalOptions,
            enabled: false,
        }
    }

    if (rateLimit === true || rateLimit === undefined) {
        return {
            ...globalOptions,
            enabled: true,
        }
    }

    return {
        limit: normalizePositiveInteger(rateLimit.limit, globalOptions.limit),
        windowMs: normalizePositiveInteger(rateLimit.windowMs, globalOptions.windowMs),
        prefix: normalizeString(rateLimit.prefix, globalOptions.prefix),
        message: normalizeString(rateLimit.message, globalOptions.message),
        getKey: rateLimit.getKey ?? globalOptions.getKey,
        enabled: rateLimit.enabled ?? true,
    }
}

export async function resolveRateLimitKey({ context, options }: ResolveRateLimitKeyParams) {
    if (options.getKey) return options.getKey(context)

    const action = context.action || "unknown-action"
    const identity = context.user?.id || context.ip || "anonymous"
    return `${options.prefix}:${action}:${identity}`
}

export async function checkRateLimit({ context, rateLimit }: CheckRateLimitParams): Promise<RateLimitCheckResult | undefined> {
    if (!isGlobalRateLimitEnabled()) return undefined

    const options = resolveRateLimitOptions({ rateLimit })
    if (!options.enabled) return undefined

    const key = await resolveRateLimitKey({
        context,
        options,
    })

    const store = getGlobalRateLimitStore()
    const now = Date.now()
    const state = await store.get(key)

    const isExpired = !state || state.resetAt <= now
    const resetAt = isExpired ? now + options.windowMs : state.resetAt
    const current = isExpired ? 1 : state.count + 1
    const remaining = current >= options.limit ? 0 : options.limit - current
    const allowed = current <= options.limit
    const ttlMs = Math.max(resetAt - now, 1)

    await store.set({
        key,
        state: {
            count: current,
            resetAt,
        },
        ttlMs,
    })

    return {
        key,
        limit: options.limit,
        current,
        remaining,
        resetAt,
        allowed,
        message: options.message,
    }
}
