import { useId } from "react"

import { useMutation, UseMutationOptions } from "@tanstack/react-query"
import { createRequestFn } from "deepsea-tools"

import { runDockerContainerAction } from "@/actions/runDockerContainer"

import { DockerContainerCommandLabel } from "@/schemas/dockerContainerCommand"
import { runDockerContainerSchema } from "@/schemas/runDockerContainer"

export const runDockerContainerClient = createRequestFn({
    fn: runDockerContainerAction,
    schema: runDockerContainerSchema,
})

export interface UseRunDockerContainerParams<TOnMutateResult = unknown> extends Omit<
    UseMutationOptions<Awaited<ReturnType<typeof runDockerContainerClient>>, Error, Parameters<typeof runDockerContainerClient>[0], TOnMutateResult>,
    "mutationFn"
> {}

export function useRunDockerContainer<TOnMutateResult = unknown>({
    onMutate,
    onSuccess,
    onError,
    onSettled,
    ...rest
}: UseRunDockerContainerParams<TOnMutateResult> = {}) {
    const key = useId()

    return useMutation({
        mutationFn: runDockerContainerClient,
        onMutate(variables, context) {
            const actionName = DockerContainerCommandLabel[variables.command] ?? "操作"

            message.open({
                key,
                type: "loading",
                content: `${actionName} 容器中...`,
                duration: 0,
            })

            return onMutate?.(variables, context) as TOnMutateResult | Promise<TOnMutateResult>
        },
        onSuccess(data, variables, onMutateResult, context) {
            const actionName = DockerContainerCommandLabel[variables.command] ?? "操作"

            context.client.invalidateQueries({ queryKey: ["query-docker-container"] })

            message.open({
                key,
                type: "success",
                content: `${actionName} 容器成功`,
            })

            return onSuccess?.(data, variables, onMutateResult, context)
        },
        onError(error, variables, onMutateResult, context) {
            message.destroy(key)

            return onError?.(error, variables, onMutateResult, context)
        },
        onSettled(data, error, variables, onMutateResult, context) {
            return onSettled?.(data, error, variables, onMutateResult, context)
        },
        ...rest,
    })
}
