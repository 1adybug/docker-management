import { withUseMutationDefaults } from "soda-tanstack-query"
import { toast } from "sonner"

import type { unbanUser } from "@/shared/unbanUser"

export const createUseUnbanUser = withUseMutationDefaults<typeof unbanUser>(() => ({
    onMutate(variables, context) {},
    onSuccess(data, variables, onMutateResult, context) {
        context.client.invalidateQueries({ queryKey: ["query-user"] })
        context.client.invalidateQueries({ queryKey: ["get-user", data.id] })

        toast.success("解封成功")
    },
    onError(error, variables, onMutateResult, context) {},
    onSettled(data, error, variables, onMutateResult, context) {},
}))
