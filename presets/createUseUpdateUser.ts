import { useId } from "react"

import { withUseMutationDefaults } from "soda-tanstack-query"
import { toast } from "sonner"

import type { updateUser } from "@/shared/updateUser"

export const createUseUpdateUser = withUseMutationDefaults<typeof updateUser>(() => {
    const key = useId()

    return {
        onMutate(variables, context) {
            toast.loading("更新用户中...", { id: key, duration: Infinity })
        },
        onSuccess(data, variables, onMutateResult, context) {
            context.client.invalidateQueries({ queryKey: ["query-user"] })
            context.client.invalidateQueries({ queryKey: ["get-user", data.id] })

            toast.success("更新用户成功", { id: key })
        },
        onError(error, variables, onMutateResult, context) {
            toast.dismiss(key)
        },
        onSettled(data, error, variables, onMutateResult, context) {},
    }
})
