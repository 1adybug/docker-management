import { useId } from "react"

import { withUseMutationDefaults } from "soda-tanstack-query"
import { toast } from "sonner"

import type { updateCurrentUserProfile } from "@/shared/updateCurrentUserProfile"

export const createUseUpdateCurrentUserProfile = withUseMutationDefaults<typeof updateCurrentUserProfile>(() => {
    const key = useId()

    return {
        onMutate(variables, context) {
            toast.loading("保存个人资料中...", { id: key, duration: Infinity })
        },
        onSuccess(data, variables, onMutateResult, context) {
            context.client.invalidateQueries({ queryKey: ["query-user"] })
            context.client.invalidateQueries({ queryKey: ["get-user", data.id] })

            toast.success("个人资料已更新", { id: key })
        },
        onError(error, variables, onMutateResult, context) {
            toast.dismiss(key)
        },
        onSettled(data, error, variables, onMutateResult, context) {},
    }
})
