import { withUseMutationDefaults } from "soda-tanstack-query"

import type { banUser } from "@/shared/banUser"

import { toast } from "@/utils/toast"

export const createUseBanUser = withUseMutationDefaults<typeof banUser>(() => ({
    onMutate(variables, context) {},
    onSuccess(data, variables, onMutateResult, context) {
        context.client.invalidateQueries({ queryKey: ["query-user"] })
        context.client.invalidateQueries({ queryKey: ["get-user", data.id] })

        toast.success("封禁成功")
    },
    onError(error, variables, onMutateResult, context) {},
    onSettled(data, error, variables, onMutateResult, context) {},
}))
