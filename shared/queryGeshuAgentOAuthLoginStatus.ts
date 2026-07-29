import { createSharedFn } from "@/server/createSharedFn"
import { getGeshuAgentOAuthLoginStatus } from "@/server/geshuAgentOAuth"

export const queryGeshuAgentOAuthLoginStatus = createSharedFn({
    name: "queryGeshuAgentOAuthLoginStatus",
    filter: false,
})(async function queryGeshuAgentOAuthLoginStatus() {
    return getGeshuAgentOAuthLoginStatus()
})
