import { useId } from "react"

import { withUseMutationDefaults } from "soda-tanstack-query"
import { toast } from "sonner"

import type { createFirstUser } from "@/shared/createFirstUser"

export const createUseCreateFirstUser = withUseMutationDefaults<typeof createFirstUser>(() => {
    const key = useId()

    return {
        onMutate(variables, context) {
            toast.loading("初始化中...", { id: key, duration: Infinity })
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
