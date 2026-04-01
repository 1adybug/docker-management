/** ANSI 样式状态 */
export interface AnsiStyleState {
    color?: string
    backgroundColor?: string
    fontWeight?: string
}

const ansiSgrPattern = new RegExp(String.raw`\u001B\[([0-9;]*)m`, "gu")

const ansiColorMap = {
    30: "#111827",
    31: "#ef4444",
    32: "#22c55e",
    33: "#f59e0b",
    34: "#3b82f6",
    35: "#d946ef",
    36: "#06b6d4",
    37: "#f3f4f6",
    90: "#6b7280",
    91: "#f87171",
    92: "#4ade80",
    93: "#fbbf24",
    94: "#60a5fa",
    95: "#e879f9",
    96: "#22d3ee",
    97: "#ffffff",
} as const

const ansiBackgroundColorMap = {
    40: "#111827",
    41: "#7f1d1d",
    42: "#14532d",
    43: "#78350f",
    44: "#1e3a8a",
    45: "#701a75",
    46: "#155e75",
    47: "#f3f4f6",
    100: "#374151",
    101: "#b91c1c",
    102: "#15803d",
    103: "#a16207",
    104: "#1d4ed8",
    105: "#a21caf",
    106: "#0f766e",
    107: "#ffffff",
} as const

/** 转义 HTML */
export function escapeHtml(value: string) {
    return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;")
}

function cloneAnsiStyle(style: AnsiStyleState) {
    return { ...style } as AnsiStyleState
}

function resetAnsiStyle(style: AnsiStyleState) {
    delete style.color
    delete style.backgroundColor
    delete style.fontWeight
}

function applyAnsiCode(style: AnsiStyleState, code: number) {
    if (code === 0) {
        resetAnsiStyle(style)
        return
    }

    if (code === 1) {
        style.fontWeight = "700"
        return
    }

    if (code === 22) {
        delete style.fontWeight
        return
    }

    if (code === 39) {
        delete style.color
        return
    }

    if (code === 49) {
        delete style.backgroundColor
        return
    }

    if (code in ansiColorMap) {
        style.color = ansiColorMap[code as keyof typeof ansiColorMap]
        return
    }

    if (code in ansiBackgroundColorMap) style.backgroundColor = ansiBackgroundColorMap[code as keyof typeof ansiBackgroundColorMap]
}

function getAnsiStyleText(style: AnsiStyleState) {
    const styleList = [
        style.color ? `color:${style.color}` : "",
        style.backgroundColor ? `background-color:${style.backgroundColor}` : "",
        style.fontWeight ? `font-weight:${style.fontWeight}` : "",
    ].filter(Boolean)

    return styleList.join(";")
}

function wrapAnsiHtmlSegment(value: string, style: AnsiStyleState) {
    const escapedValue = escapeHtml(value)
    const styleText = getAnsiStyleText(style)

    if (!styleText) return escapedValue

    return `<span style="${styleText}">${escapedValue}</span>`
}

/** 将 ANSI 日志转换为 HTML */
export function ansiToHtml(value?: string) {
    if (!value) return ""

    let result = ""
    let lastIndex = 0
    const style = {} as AnsiStyleState

    for (const match of value.matchAll(ansiSgrPattern)) {
        const index = match.index ?? 0

        if (index > lastIndex) result += wrapAnsiHtmlSegment(value.slice(lastIndex, index), cloneAnsiStyle(style))

        const codes = (match[1] || "0")
            .split(";")
            .map(item => item.trim())
            .filter(Boolean)
            .map(item => Number(item))
            .filter(item => Number.isFinite(item))

        for (const code of codes.length > 0 ? codes : [0]) applyAnsiCode(style, code)

        lastIndex = index + match[0].length
    }

    if (lastIndex < value.length) result += wrapAnsiHtmlSegment(value.slice(lastIndex), cloneAnsiStyle(style))

    return result
}
