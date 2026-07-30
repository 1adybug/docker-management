import { AsyncLocalStorage } from "node:async_hooks"

const skillAuthorizationRequestContext = new AsyncLocalStorage<boolean>()

export function runWithSkillAuthorizationRequest<T>(callback: () => Promise<T>) {
    return skillAuthorizationRequestContext.run(true, callback)
}

export function isSkillAuthorizationRequest() {
    return skillAuthorizationRequestContext.getStore() === true
}
