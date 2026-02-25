import { User } from "@/prisma/generated/client"

export type FilterResolver = (user: User) => boolean

export type FilterConfig = boolean | FilterResolver

export function createFilter<T extends FilterConfig>(filter: T) {
    return filter
}
