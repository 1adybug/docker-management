import { RateLimitState, RateLimitStore, SetRateLimitStateParams } from "./createRateLimit"

export interface RedisSetValueParams {
    key: string
    value: string
    ttlMs: number
}

export type RedisGetValue = (key: string) => Promise<string | null | undefined>

export type RedisSetValue = (params: RedisSetValueParams) => Promise<void>

export type RedisDeleteValue = (key: string) => Promise<void>

export interface CreateRedisRateLimitStoreParams {
    get: RedisGetValue
    set: RedisSetValue
    delete?: RedisDeleteValue
}

function parseRateLimitState(value: string): RateLimitState | undefined {
    try {
        const parsed = JSON.parse(value) as Partial<RateLimitState>
        const { count, resetAt } = parsed
        if (typeof count !== "number" || !Number.isFinite(count)) return undefined
        if (typeof resetAt !== "number" || !Number.isFinite(resetAt)) return undefined
        return { count, resetAt }
    } catch {
        return undefined
    }
}

export function createRedisRateLimitStore({ get: getValue, set: setValue, delete: deleteValue }: CreateRedisRateLimitStoreParams): RateLimitStore {
    async function get(key: string) {
        const value = await getValue(key)
        if (!value) return undefined
        return parseRateLimitState(value)
    }

    async function set({ key, state, ttlMs }: SetRateLimitStateParams) {
        await setValue({
            key,
            value: JSON.stringify(state),
            ttlMs,
        })
    }

    async function del(key: string) {
        await deleteValue?.(key)
    }

    return {
        get,
        set,
        delete: del,
    }
}
