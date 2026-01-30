import { useId } from "react"

import { useMutation, UseMutationOptions } from "@tanstack/react-query"
import { createRequestFn } from "deepsea-tools"

import { addProjectAction } from "@/actions/addProject"

import { addProjectSchema } from "@/schemas/addProject"

export const addProjectClient = createRequestFn({
    fn: addProjectAction,
    schema: addProjectSchema,
})

export interface UseAddProjectParams<TOnMutateResult = unknown> extends Omit<
    UseMutationOptions<Awaited<ReturnType<typeof addProjectClient>>, Error, Parameters<typeof addProjectClient>[0], TOnMutateResult>,
    "mutationFn"
> {}

export function useAddProject<TOnMutateResult = unknown>({
    onMutate,
    onSuccess,
    onError,
    onSettled,
    ...rest
}: UseAddProjectParams<TOnMutateResult> = {}) {
    const key = useId()

    return useMutation({
        mutationFn: addProjectClient,
        onMutate(variables, context) {
            message.open({
                key,
                type: "loading",
                content: "新增项目中...",
                duration: 0,
            })

            return onMutate?.(variables, context) as TOnMutateResult | Promise<TOnMutateResult>
        },
        onSuccess(data, variables, onMutateResult, context) {
            context.client.invalidateQueries({ queryKey: ["query-project"] })

            message.open({
                key,
                type: "success",
                content: "新增项目成功",
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
