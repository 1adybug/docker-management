import dayjs, { type Dayjs } from "dayjs"
import { isNonNullable, naturalParser } from "deepsea-tools"

export function parseQueryDate(value: string | null | undefined) {
    const timestamp = naturalParser(value)
    return isNonNullable(timestamp) ? dayjs(timestamp) : undefined
}

export function stringifyQueryStartDate(value?: Dayjs) {
    return value?.startOf("day").valueOf().toString()
}

export function stringifyQueryEndDate(value?: Dayjs) {
    return value?.endOf("day").valueOf().toString()
}
