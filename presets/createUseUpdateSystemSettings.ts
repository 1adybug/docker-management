import { useId } from "react"

import { withUseMutationDefaults } from "soda-tanstack-query"

import { updateSystemSettings } from "@/shared/updateSystemSettings"

export const createUseUpdateSystemSettings = withUseMutationDefaults<typeof updateSystemSettings>(() => {
    const key = useId()

    return {
        onMutate(variables, context) {
            message.open({
                key,
                type: "loading",
                content: "保存系统设置中...",
                duration: 0,
            })
        },
        onSuccess(data, variables, onMutateResult, context) {
            context.client.invalidateQueries({ queryKey: ["query-system-settings"] })

            message.open({
                key,
                type: "success",
                content: "系统设置已保存",
            })
        },
        onError(error, variables, onMutateResult, context) {
            message.destroy(key)
        },
        onSettled(data, error, variables, onMutateResult, context) {},
    }
})
