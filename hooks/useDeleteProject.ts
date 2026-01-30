import { useId } from "react"

import { useMutation, UseMutationOptions } from "@tanstack/react-query"
import { createRequestFn } from "deepsea-tools"

import { deleteProjectAction } from "@/actions/deleteProject"

import { deleteProjectSchema } from "@/schemas/deleteProject"

export const deleteProjectClient = createRequestFn({
    fn: deleteProjectAction,
    schema: deleteProjectSchema,
})

export interface UseDeleteProjectParams<TOnMutateResult = unknown> extends Omit<
    UseMutationOptions<Awaited<ReturnType<typeof deleteProjectClient>>, Error, Parameters<typeof deleteProjectClient>[0], TOnMutateResult>,
    "mutationFn"
> {}

export function useDeleteProject<TOnMutateResult = unknown>({
    onMutate,
    onSuccess,
    onError,
    onSettled,
    ...rest
}: UseDeleteProjectParams<TOnMutateResult> = {}) {
    const key = useId()

    return useMutation({
        mutationFn: deleteProjectClient,
        onMutate(variables, context) {
            message.open({
                key,
                type: "loading",
                content: "删除项目中...",
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
                content: "删除项目成功",
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
