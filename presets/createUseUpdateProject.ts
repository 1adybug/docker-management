import { useId } from "react"

import { withUseMutationDefaults } from "soda-tanstack-query"

import type { updateProject } from "@/shared/updateProject"

import { toast } from "@/utils/toast"

export const createUseUpdateProject = withUseMutationDefaults<typeof updateProject>(() => {
    const key = useId()

    return {
        onMutate(variables, context) {
            toast.loading("保存项目中...", { id: key })
        },
        onSuccess(data, variables, onMutateResult, context) {
            context.client.invalidateQueries({ queryKey: ["query-project"] })
            context.client.invalidateQueries({ queryKey: ["get-project", data.name] })
            context.client.invalidateQueries({ queryKey: ["query-docker-image-detail"] })
            context.client.invalidateQueries({ queryKey: ["query-docker-container"] })

            toast.success("保存项目成功", { id: key })
        },
        onError(error, variables, onMutateResult, context) {
            toast.dismiss(key)
        },
        onSettled(data, error, variables, onMutateResult, context) {},
    }
})
