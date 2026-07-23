import { useId } from "react"

import { withUseMutationDefaults } from "soda-tanstack-query"

import type { addProject } from "@/shared/addProject"

import { toast } from "@/utils/toast"

export const createUseAddProject = withUseMutationDefaults<typeof addProject>(() => {
    const key = useId()

    return {
        onMutate(variables, context) {
            toast.loading("新增项目中...", { id: key })
        },
        onSuccess(data, variables, onMutateResult, context) {
            context.client.invalidateQueries({ queryKey: ["query-project"] })
            context.client.invalidateQueries({ queryKey: ["query-docker-image-detail"] })
            context.client.invalidateQueries({ queryKey: ["query-docker-container"] })

            toast.success("新增项目成功", { id: key })
        },
        onError(error, variables, onMutateResult, context) {
            toast.dismiss(key)
        },
        onSettled(data, error, variables, onMutateResult, context) {},
    }
})
