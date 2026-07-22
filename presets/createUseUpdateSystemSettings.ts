import { useId } from "react"

import { withUseMutationDefaults } from "soda-tanstack-query"

import type { updateSystemSettings } from "@/shared/updateSystemSettings"

import { toast } from "@/utils/toast"

export const createUseUpdateSystemSettings = withUseMutationDefaults<typeof updateSystemSettings>(() => {
    const key = useId()

    return {
        onMutate(variables, context) {
            toast.loading("保存系统设置中...", { id: key })
        },
        onSuccess(data, variables, onMutateResult, context) {
            context.client.invalidateQueries({ queryKey: ["query-system-settings"] })

            toast.success("系统设置已保存", { id: key })
        },
        onError(error, variables, onMutateResult, context) {
            toast.dismiss(key)
        },
        onSettled(data, error, variables, onMutateResult, context) {},
    }
})
