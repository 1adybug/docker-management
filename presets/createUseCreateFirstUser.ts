import { useId } from "react"

import { withUseMutationDefaults } from "soda-tanstack-query"

import { createFirstUser } from "@/shared/createFirstUser"

export const createUseCreateFirstUser = withUseMutationDefaults<typeof createFirstUser>(() => {
    const key = useId()

    return {
        onMutate(variables, context) {
            message.open({
                key,
                type: "loading",
                content: "初始化中...",
                duration: 0,
            })
        },
        onSuccess(data, variables, onMutateResult, context) {
            message.open({
                key,
                type: "success",
                content: "初始化成功",
            })
        },
        onError(error, variables, onMutateResult, context) {
            message.destroy(key)
        },
        onSettled(data, error, variables, onMutateResult, context) {},
    }
})
