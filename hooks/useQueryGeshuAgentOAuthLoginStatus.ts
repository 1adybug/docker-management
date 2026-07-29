import { createRequestFn } from "deepsea-tools"
import { createUseQuery } from "soda-tanstack-query"

import { queryGeshuAgentOAuthLoginStatusAction } from "@/actions/queryGeshuAgentOAuthLoginStatus"

export const queryGeshuAgentOAuthLoginStatusClient = createRequestFn(queryGeshuAgentOAuthLoginStatusAction)

export const useQueryGeshuAgentOAuthLoginStatus = createUseQuery({
    queryFn: queryGeshuAgentOAuthLoginStatusClient,
    queryKey: "query-geshu-agent-oauth-login-status",
})
