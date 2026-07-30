import { AsyncLocalStorage } from "node:async_hooks"

const skillAuthorizationRequestContext = new AsyncLocalStorage<boolean>()

export function runWithSkillAuthorizationRequest<T>(request: Request, callback: () => Promise<T>) {
    const pathname = new URL(request.url).pathname
    if (!pathname.startsWith("/api/action/")) return callback()

    return skillAuthorizationRequestContext.run(true, callback)
}

export function isSkillAuthorizationRequest() {
    return skillAuthorizationRequestContext.getStore() === true
}
