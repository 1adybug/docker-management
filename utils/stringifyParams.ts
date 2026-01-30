export function stringifyParams(params?: unknown[]): string | undefined {
    if (!params || params.length === 0) return undefined
    let result: string | undefined

    try {
        if (params.length === 1) result = JSON.stringify(params[0])
        else result = JSON.stringify(params)
    } catch (error) {}

    return result
}
