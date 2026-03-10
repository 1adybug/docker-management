import { useId } from "react"

import { withUseMutationDefaults } from "soda-tanstack-query"

import { updateProject } from "@/shared/updateProject"

export const createUseUpdateProject = withUseMutationDefaults<typeof updateProject>(() => {
    const key = useId()

    return {
        onMutate(variables, context) {
            message.open({
                key,
                type: "loading",
                content: "保存项目中...",
                duration: 0,
            })
        },
        onSuccess(data, variables, onMutateResult, context) {
            context.client.invalidateQueries({ queryKey: ["query-project"] })
            context.client.invalidateQueries({ queryKey: ["get-project", data.name] })

            message.open({
                key,
                type: "success",
                content: "保存项目成功",
            })
        },
        onError(error, variables, onMutateResult, context) {
            message.destroy(key)
        },
        onSettled(data, error, variables, onMutateResult, context) {},
    }
})
