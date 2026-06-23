import { createSharedFn } from "@/server/createSharedFn"
import { getGeshuOAuthLoginStatus } from "@/server/geshuOAuth"

export const queryGeshuOAuthLoginStatus = createSharedFn({
    name: "queryGeshuOAuthLoginStatus",
    filter: false,
})(async function queryGeshuOAuthLoginStatus() {
    return getGeshuOAuthLoginStatus()
})
