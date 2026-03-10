import { useId } from "react"

import { withUseMutationDefaults } from "soda-tanstack-query"

import { ProjectCommandLabel } from "@/schemas/projectCommand"

import { runProject } from "@/shared/runProject"

export const createUseRunProject = withUseMutationDefaults<typeof runProject>(() => {
    const key = useId()

    return {
        onMutate(variables, context) {
            const actionName = ProjectCommandLabel[variables.command] ?? "操作"

            message.open({
                key,
                type: "loading",
                content: `${actionName} 项目中...`,
                duration: 0,
            })
        },
        onSuccess(data, variables, onMutateResult, context) {
            const actionName = ProjectCommandLabel[variables.command] ?? "操作"

            message.open({
                key,
                type: "success",
                content: `${actionName} 项目成功`,
            })
        },
        onError(error, variables, onMutateResult, context) {
            message.destroy(key)
        },
        onSettled(data, error, variables, onMutateResult, context) {},
    }
})
