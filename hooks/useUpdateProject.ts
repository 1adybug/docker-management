import { useId } from "react"

import { useMutation, UseMutationOptions } from "@tanstack/react-query"
import { createRequestFn } from "deepsea-tools"

import { updateProjectAction } from "@/actions/updateProject"

import { updateProjectSchema } from "@/schemas/updateProject"

export const updateProjectClient = createRequestFn({
    fn: updateProjectAction,
    schema: updateProjectSchema,
})

export interface UseUpdateProjectParams<TOnMutateResult = unknown> extends Omit<
    UseMutationOptions<Awaited<ReturnType<typeof updateProjectClient>>, Error, Parameters<typeof updateProjectClient>[0], TOnMutateResult>,
    "mutationFn"
> {}

export function useUpdateProject<TOnMutateResult = unknown>({
    onMutate,
    onSuccess,
    onError,
    onSettled,
    ...rest
}: UseUpdateProjectParams<TOnMutateResult> = {}) {
    const key = useId()

    return useMutation({
        mutationFn: updateProjectClient,
        onMutate(variables, context) {
            message.open({
                key,
                type: "loading",
                content: "保存项目中...",
                duration: 0,
            })

            return onMutate?.(variables, context) as TOnMutateResult | Promise<TOnMutateResult>
        },
        onSuccess(data, variables, onMutateResult, context) {
            context.client.invalidateQueries({ queryKey: ["query-project"] })
            context.client.invalidateQueries({ queryKey: ["get-project", data.name] })

            message.open({
                key,
                type: "success",
                content: "保存项目成功",
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
