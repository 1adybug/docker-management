import { createRequestFn } from "deepsea-tools"
import { createUseQuery } from "soda-tanstack-query"

import { querySystemSettingsAction } from "@/actions/querySystemSettings"

export const querySystemSettingsClient = createRequestFn(querySystemSettingsAction)

export const useQuerySystemSettings = createUseQuery({
    queryFn: querySystemSettingsClient,
    queryKey: "query-system-settings",
})
