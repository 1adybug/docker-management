import { useId } from "react"

import { withUseMutationDefaults } from "soda-tanstack-query"

import { ProjectCommand, ProjectCommandLabel } from "@/schemas/projectCommand"

import type { runProject } from "@/shared/runProject"

import { toast } from "@/utils/toast"

export const createUseRunProject = withUseMutationDefaults<typeof runProject>(() => {
    const key = useId()

    return {
        onMutate(variables, context) {
            const actionName = ProjectCommandLabel[variables.command] ?? "操作"

            toast.loading(`${actionName} 项目中...`, { id: key })
        },
        onSuccess(data, variables, onMutateResult, context) {
            const actionName = ProjectCommandLabel[variables.command] ?? "操作"

            if (variables.command !== ProjectCommand.日志) context.client.invalidateQueries({ queryKey: ["query-docker-container"] })

            if (variables.command === ProjectCommand.拉取) {
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
