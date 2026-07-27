export interface RedactSensitiveValueParams {
    value: unknown
    seen: WeakSet<object>
}

const SensitiveKeyPattern = /(secret|password|token|otp|authorization|cookie|api[_-]?key|access[_-]?key|private[_-]?key|credential)/i

export function isSensitiveKey(key: string) {
    return SensitiveKeyPattern.test(key)
}

export function redactSensitiveValue({ value, seen }: RedactSensitiveValueParams): unknown {
    if (value instanceof Date) return value
    if (Array.isArray(value)) return value.map(item => redactSensitiveValue({ value: item, seen }))
    if (!value || typeof value !== "object") return value

    if (seen.has(value)) return "[Circular]"
    seen.add(value)

    return Object.fromEntries(
        Object.entries(value).map(([key, child]) => [key, isSensitiveKey(key) ? "[已隐藏]" : redactSensitiveValue({ value: child, seen })]),
    )
}

export function stringifyParams(params?: unknown[]): string | undefined {
    if (!params || params.length === 0) return undefined
    let result: string | undefined

    try {
        const value = params.length === 1 ? params[0] : params
        result = JSON.stringify(redactSensitiveValue({ value, seen: new WeakSet() }))
    } catch (error) {}

    return result
}
