import { useId } from "react"

import { useMutation, UseMutationOptions } from "@tanstack/react-query"
import { createRequestFn } from "deepsea-tools"

import { createFirstUserAction } from "@/actions/createFirstUser"

import { createFirstUserSchema } from "@/schemas/createFirstUser"

export const createFirstUserClient = createRequestFn({
    fn: createFirstUserAction,
    schema: createFirstUserSchema,
})

export interface UseCreateFirstUserParams<TOnMutateResult = unknown> extends Omit<
    UseMutationOptions<Awaited<ReturnType<typeof createFirstUserClient>>, Error, Parameters<typeof createFirstUserClient>[0], TOnMutateResult>,
    "mutationFn"
> {}

export function useCreateFirstUser<TOnMutateResult = unknown>({
    onMutate,
    onSuccess,
    onError,
    onSettled,
    ...rest
}: UseCreateFirstUserParams<TOnMutateResult> = {}) {
    const key = useId()

    return useMutation({
        mutationFn: createFirstUserClient,
        onMutate(variables, context) {
            message.open({
                key,
                type: "loading",
                content: "初始化中...",
                duration: 0,
            })

            return onMutate?.(variables, context) as TOnMutateResult | Promise<TOnMutateResult>
        },
        onSuccess(data, variables, onMutateResult, context) {
            message.open({
                key,
                type: "success",
                content: "初始化成功",
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
