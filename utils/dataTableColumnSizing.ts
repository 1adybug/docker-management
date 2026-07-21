import type { ColumnSizingState } from "@tanstack/react-table"

const DataTableColumnSizingStoragePrefix = "geshu-next-shadcn-template:data-table-column-sizing:v1"

export function getDataTableColumnSizingStorageKey(columnSizingKey: string) {
    return `${DataTableColumnSizingStoragePrefix}:${columnSizingKey}`
}

export function parseDataTableColumnSizing(value: string | null): ColumnSizingState {
    if (!value) return {}

    try {
        const parsed: unknown = JSON.parse(value)
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {}

        const columnSizing: ColumnSizingState = {}

        for (const [columnId, size] of Object.entries(parsed)) {
            if (typeof size === "number" && Number.isFinite(size) && size > 0) columnSizing[columnId] = size
        }

        return columnSizing
    } catch {
        return {}
    }
}
