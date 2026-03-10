import { useId } from "react"

import { withUseMutationDefaults } from "soda-tanstack-query"

import { DockerContainerCommandLabel } from "@/schemas/dockerContainerCommand"

import { runDockerContainer } from "@/shared/runDockerContainer"

export const createUseRunDockerContainer = withUseMutationDefaults<typeof runDockerContainer>(() => {
    const key = useId()

    return {
        onMutate(variables, context) {
            const actionName = DockerContainerCommandLabel[variables.command] ?? "操作"

            message.open({
                key,
                type: "loading",
                content: `${actionName} 容器中...`,
                duration: 0,
            })
        },
        onSuccess(data, variables, onMutateResult, context) {
            const actionName = DockerContainerCommandLabel[variables.command] ?? "操作"

            context.client.invalidateQueries({ queryKey: ["query-docker-container"] })

            message.open({
                key,
                type: "success",
                content: `${actionName} 容器成功`,
            })
        },
        onError(error, variables, onMutateResult, context) {
            message.destroy(key)
        },
        onSettled(data, error, variables, onMutateResult, context) {},
    }
})
