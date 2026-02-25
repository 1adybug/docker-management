import { RateLimitState, RateLimitStore, SetRateLimitStateParams } from "./createRateLimit"

export interface MemoryRateLimitTimer {
    timer: ReturnType<typeof setTimeout>
}

export function createMemoryRateLimitStore(): RateLimitStore {
    const stateMap = new Map<string, RateLimitState>()
    const timerMap = new Map<string, MemoryRateLimitTimer>()

    async function deleteValue(key: string) {
        const oldTimer = timerMap.get(key)

        if (oldTimer) {
            clearTimeout(oldTimer.timer)
            timerMap.delete(key)
        }

        stateMap.delete(key)
    }

    async function get(key: string) {
        const state = stateMap.get(key)
        if (!state) return undefined

        if (state.resetAt <= Date.now()) {
            await deleteValue(key)
            return undefined
        }

        return state
    }

    async function set({ key, state, ttlMs }: SetRateLimitStateParams) {
        stateMap.set(key, state)

        const oldTimer = timerMap.get(key)
        if (oldTimer) clearTimeout(oldTimer.timer)

        const timer = setTimeout(() => {
            stateMap.delete(key)
            timerMap.delete(key)
        }, ttlMs)

        if (typeof timer.unref === "function") timer.unref()

        timerMap.set(key, {
            timer,
        })
    }

    return {
        get,
        set,
        delete: deleteValue,
    }
}
