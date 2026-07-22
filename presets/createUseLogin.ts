import { useId } from "react"

import { withUseMutationDefaults } from "soda-tanstack-query"

import type { login } from "@/shared/login"

import { toast } from "@/utils/toast"

export const createUseLogin = withUseMutationDefaults<typeof login>(() => {
    const key = useId()

    return {
        onMutate(variables, context) {
            toast.loading("登录中...", { id: key })
        },
        onSuccess(data, variables, onMutateResult, context) {
            toast.success("登录成功", { id: key })
        },
        onError(error, variables, onMutateResult, context) {
            toast.dismiss(key)
        },
        onSettled(data, error, variables, onMutateResult, context) {},
    }
})
