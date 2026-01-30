import { SortOrderParams } from "@/schemas/sortOrder"

export interface QueryBase<SortBy extends string> {
    sortBy?: SortBy
    sortOrder?: SortOrderParams
}

export function getSortOrder<SortBy extends string>(query: QueryBase<SortBy>, key: NonNullable<SortBy>) {
    return query.sortBy === key ? (query.sortOrder === "asc" ? "ascend" : query.sortOrder === "desc" ? "descend" : null) : null
}
