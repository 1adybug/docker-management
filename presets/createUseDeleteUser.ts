import { useId } from "react"

import { withUseMutationDefaults } from "soda-tanstack-query"

import type { deleteUser } from "@/shared/deleteUser"

import { toast } from "@/utils/toast"

export const createUseDeleteUser = withUseMutationDefaults<typeof deleteUser>(() => {
    const key = useId()

    return {
        onMutate(variables, context) {
            toast.loading("删除用户中...", { id: key })
        },
        onSuccess(data, variables, onMutateResult, context) {
            context.client.invalidateQueries({ queryKey: ["query-user"] })
            context.client.invalidateQueries({ queryKey: ["get-user", data.id] })

            toast.success("删除用户成功", { id: key })
        },
        onError(error, variables, onMutateResult, context) {
            toast.dismiss(key)
        },
        onSettled(data, error, variables, onMutateResult, context) {},
    }
})
