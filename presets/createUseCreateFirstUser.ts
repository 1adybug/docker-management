import { useId } from "react"

import { withUseMutationDefaults } from "soda-tanstack-query"

import type { createFirstUser } from "@/shared/createFirstUser"

import { toast } from "@/utils/toast"

export const createUseCreateFirstUser = withUseMutationDefaults<typeof createFirstUser>(() => {
    const key = useId()

    return {
        onMutate(variables, context) {
            toast.loading("初始化中...", { id: key })
        },
        onSuccess(data, variables, onMutateResult, context) {
            toast.success("初始化成功", { id: key })
        },
        onError(error, variables, onMutateResult, context) {
            toast.dismiss(key)
        },
        onSettled(data, error, variables, onMutateResult, context) {},
    }
})
