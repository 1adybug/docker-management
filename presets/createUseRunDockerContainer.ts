import { useId } from "react"

import { withUseMutationDefaults } from "soda-tanstack-query"

import { DockerContainerCommandLabel } from "@/schemas/dockerContainerCommand"

import type { runDockerContainer } from "@/shared/runDockerContainer"

import { toast } from "@/utils/toast"

export const createUseRunDockerContainer = withUseMutationDefaults<typeof runDockerContainer>(() => {
    const key = useId()

    return {
        onMutate(variables, context) {
            const actionName = DockerContainerCommandLabel[variables.command] ?? "操作"

            toast.loading(`${actionName} 容器中...`, { id: key })
        },
        onSuccess(data, variables, onMutateResult, context) {
            const actionName = DockerContainerCommandLabel[variables.command] ?? "操作"

            context.client.invalidateQueries({ queryKey: ["query-docker-container"] })

            toast.success(`${actionName} 容器成功`, { id: key })
        },
        onError(error, variables, onMutateResult, context) {
            toast.dismiss(key)
        },
        onSettled(data, error, variables, onMutateResult, context) {},
    }
})
