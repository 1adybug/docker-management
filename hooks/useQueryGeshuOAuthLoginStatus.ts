import { createRequestFn } from "deepsea-tools"
import { createUseQuery } from "soda-tanstack-query"

import { queryGeshuOAuthLoginStatusAction } from "@/actions/queryGeshuOAuthLoginStatus"

export const queryGeshuOAuthLoginStatusClient = createRequestFn(queryGeshuOAuthLoginStatusAction)

export const useQueryGeshuOAuthLoginStatus = createUseQuery({
    queryFn: queryGeshuOAuthLoginStatusClient,
    queryKey: "query-geshu-oauth-login-status",
})
