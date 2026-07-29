const InternalUrlOrigin = "https://internal.local"

export function getSafeInternalCallbackUrl(value: string | null | undefined, fallback = "/") {
    const normalizedValue = value?.trim()
    if (!normalizedValue || !normalizedValue.startsWith("/") || normalizedValue.startsWith("//")) return fallback

    try {
        const url = new URL(normalizedValue, InternalUrlOrigin)
        if (url.origin !== InternalUrlOrigin) return fallback
        return `${url.pathname}${url.search}`
    } catch {
        return fallback
    }
}
