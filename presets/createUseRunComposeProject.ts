import { useId } from "react"

import { withUseMutationDefaults } from "soda-tanstack-query"

import { ComposeProjectCommand, ComposeProjectCommandLabel } from "@/schemas/composeProjectCommand"

import { runComposeProject } from "@/shared/runComposeProject"

export const createUseRunComposeProject = withUseMutationDefaults<typeof runComposeProject>(() => {
    const key = useId()

    return {
        onMutate(variables, context) {
            const actionName = ComposeProjectCommandLabel[variables.command] ?? "操作"

            message.open({
                key,
                type: "loading",
                content: `${actionName} 项目中...`,
                duration: 0,
            })
        },
        onSuccess(data, variables, onMutateResult, context) {
            const actionName = ComposeProjectCommandLabel[variables.command] ?? "操作"

            if (variables.command !== ComposeProjectCommand.日志) context.client.invalidateQueries({ queryKey: ["query-docker-container"] })

            if (variables.command === ComposeProjectCommand.拉取) {
                context.client.invalidateQueries({ queryKey: ["query-docker-image"] })
                context.client.invalidateQueries({ queryKey: ["query-docker-image-detail"] })
            }

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
