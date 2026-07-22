import { useId } from "react"

import { withUseMutationDefaults } from "soda-tanstack-query"

import type { addUser } from "@/shared/addUser"

import { toast } from "@/utils/toast"

export const createUseAddUser = withUseMutationDefaults<typeof addUser>(() => {
    const key = useId()
    return {
        onMutate(variables, context) {
            toast.loading("新增用户中...", { id: key })
        },
        onSuccess(data, variables, onMutateResult, context) {
            context.client.invalidateQueries({ queryKey: ["query-user"] })
            context.client.invalidateQueries({ queryKey: ["get-user", data.id] })

            toast.success("新增用户成功", { id: key })
        },
        onError(error, variables, onMutateResult, context) {
            toast.dismiss(key)
        },
        onSettled(data, error, variables, onMutateResult, context) {},
    }
})
