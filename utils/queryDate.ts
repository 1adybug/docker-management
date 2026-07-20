import dayjs from "dayjs"
import { isNonNullable, naturalParser } from "deepsea-tools"

export function parseQueryDate(value: string | null | undefined) {
    const timestamp = naturalParser(value)
    return isNonNullable(timestamp) ? new Date(timestamp) : undefined
}

export function stringifyQueryStartDate(value?: Date) {
    return value ? dayjs(value).startOf("day").valueOf().toString() : undefined
}

export function stringifyQueryEndDate(value?: Date) {
    return value ? dayjs(value).endOf("day").valueOf().toString() : undefined
}
