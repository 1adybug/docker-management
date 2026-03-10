import { useId } from "react"

import { withUseMutationDefaults } from "soda-tanstack-query"

import { addUser } from "@/shared/addUser"

export const createUseAddUser = withUseMutationDefaults<typeof addUser>(() => {
    const key = useId()
    return {
        onMutate(variables, context) {
            message.open({
                key,
                type: "loading",
                content: "新增用户中...",
                duration: 0,
            })
        },
        onSuccess(data, variables, onMutateResult, context) {
            context.client.invalidateQueries({ queryKey: ["query-user"] })
            context.client.invalidateQueries({ queryKey: ["get-user", data.id] })

            message.open({
                key,
                type: "success",
                content: "新增用户成功",
            })
        },
        onError(error, variables, onMutateResult, context) {
            message.destroy(key)
        },
        onSettled(data, error, variables, onMutateResult, context) {},
    }
})
