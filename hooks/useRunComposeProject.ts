import { useId } from "react"

import { useMutation, UseMutationOptions } from "@tanstack/react-query"
import { createRequestFn } from "deepsea-tools"

import { runComposeProjectAction } from "@/actions/runComposeProject"

import { ComposeProjectCommandLabel } from "@/schemas/composeProjectCommand"
import { runComposeProjectSchema } from "@/schemas/runComposeProject"

export const runComposeProjectClient = createRequestFn({
    fn: runComposeProjectAction,
    schema: runComposeProjectSchema,
})

export interface UseRunComposeProjectParams<TOnMutateResult = unknown> extends Omit<
    UseMutationOptions<Awaited<ReturnType<typeof runComposeProjectClient>>, Error, Parameters<typeof runComposeProjectClient>[0], TOnMutateResult>,
    "mutationFn"
> {}

export function useRunComposeProject<TOnMutateResult = unknown>({
    onMutate,
    onSuccess,
    onError,
    onSettled,
    ...rest
}: UseRunComposeProjectParams<TOnMutateResult> = {}) {
    const key = useId()

    return useMutation({
        mutationFn: runComposeProjectClient,
        onMutate(variables, context) {
            const actionName = ComposeProjectCommandLabel[variables.command] ?? "操作"

            message.open({
                key,
                type: "loading",
                content: `${actionName} 项目中...`,
                duration: 0,
            })

            return onMutate?.(variables, context) as TOnMutateResult | Promise<TOnMutateResult>
        },
        onSuccess(data, variables, onMutateResult, context) {
            const actionName = ComposeProjectCommandLabel[variables.command] ?? "操作"

            context.client.invalidateQueries({ queryKey: ["query-docker-container"] })

            message.open({
                key,
                type: "success",
                content: `${actionName} 项目成功`,
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
