import { createRequestFn, isNonNullable } from "deepsea-tools"
import { createUseQuery } from "soda-tanstack-query"

import { getProjectAction } from "@/actions/getProject"

import { GetProjectParams, getProjectSchema } from "@/schemas/getProject"

export const getProjectClient = createRequestFn({
    fn: getProjectAction,
    schema: getProjectSchema,
})

export function getProjectClientOptional(params?: GetProjectParams | undefined) {
    return isNonNullable(params) ? getProjectClient(params) : null
}

export const useGetProject = createUseQuery({
    queryFn: getProjectClientOptional,
    queryKey: "get-project",
})
