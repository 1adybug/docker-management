import { useId } from "react"

import { useMutation, UseMutationOptions } from "@tanstack/react-query"
import { createRequestFn } from "deepsea-tools"

import { runProjectAction } from "@/actions/runProject"

import { ProjectCommandLabel } from "@/schemas/projectCommand"
import { runProjectSchema } from "@/schemas/runProject"

export const runProjectClient = createRequestFn({
    fn: runProjectAction,
    schema: runProjectSchema,
})

export interface UseRunProjectParams<TOnMutateResult = unknown> extends Omit<
    UseMutationOptions<Awaited<ReturnType<typeof runProjectClient>>, Error, Parameters<typeof runProjectClient>[0], TOnMutateResult>,
    "mutationFn"
> {}

export function useRunProject<TOnMutateResult = unknown>({
    onMutate,
    onSuccess,
    onError,
    onSettled,
    ...rest
}: UseRunProjectParams<TOnMutateResult> = {}) {
    const key = useId()

    return useMutation({
        mutationFn: runProjectClient,
        onMutate(variables, context) {
            const actionName = ProjectCommandLabel[variables.command] ?? "操作"

            message.open({
                key,
                type: "loading",
                content: `${actionName} 项目中...`,
                duration: 0,
            })

            return onMutate?.(variables, context) as TOnMutateResult | Promise<TOnMutateResult>
        },
        onSuccess(data, variables, onMutateResult, context) {
            const actionName = ProjectCommandLabel[variables.command] ?? "操作"

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
