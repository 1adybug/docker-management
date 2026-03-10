import { useId } from "react"

import { withUseMutationDefaults } from "soda-tanstack-query"

import { banUser } from "@/shared/banUser"

export const createUseBanUser = withUseMutationDefaults<typeof banUser>(() => {
    const key = useId()

    return {
        onMutate(variables, context) {},
        onSuccess(data, variables, onMutateResult, context) {
            context.client.invalidateQueries({ queryKey: ["query-user"] })
            context.client.invalidateQueries({ queryKey: ["get-user", data.id] })

            message.open({
                key,
                type: "success",
                content: `封禁成功`,
            })
        },
        onError(error, variables, onMutateResult, context) {
            message.destroy(key)
        },
        onSettled(data, error, variables, onMutateResult, context) {},
    }
})
