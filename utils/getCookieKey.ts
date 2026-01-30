import { CookiePrefix } from "@/constants"

export function getCookieKey(key: string) {
    return `${CookiePrefix ?? ""}${key}`
}
