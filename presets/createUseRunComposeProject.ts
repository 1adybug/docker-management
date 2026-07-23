import { useId } from "react"

import { withUseMutationDefaults } from "soda-tanstack-query"

import { ComposeProjectCommand, ComposeProjectCommandLabel } from "@/schemas/composeProjectCommand"

import type { runComposeProject } from "@/shared/runComposeProject"

import { toast } from "@/utils/toast"

export const createUseRunComposeProject = withUseMutationDefaults<typeof runComposeProject>(() => {
    const key = useId()

    return {
        onMutate(variables, context) {
            const actionName = ComposeProjectCommandLabel[variables.command] ?? "操作"

            toast.loading(`${actionName} 项目中...`, { id: key })
        },
        onSuccess(data, variables, onMutateResult, context) {
            const actionName = ComposeProjectCommandLabel[variables.command] ?? "操作"

            if (variables.command !== ComposeProjectCommand.日志) context.client.invalidateQueries({ queryKey: ["query-docker-container"] })

            if (variables.command === ComposeProjectCommand.拉取) {
                context.client.invalidateQueries({ queryKey: ["query-docker-image"] })
                context.client.invalidateQueries({ queryKey: ["query-docker-image-detail"] })
            }

            toast.success(`${actionName} 项目成功`, { id: key })
        },
        onError(error, variables, onMutateResult, context) {
            toast.dismiss(key)
        },
        onSettled(data, error, variables, onMutateResult, context) {},
    }
})
