import { useId } from "react"

import { useMutation, UseMutationOptions } from "@tanstack/react-query"
import { createRequestFn } from "deepsea-tools"

import { loginAction } from "@/actions/login"

import { loginSchema } from "@/schemas/login"

export const loginClient = createRequestFn({
    fn: loginAction,
    schema: loginSchema,
})

export interface UseLoginParams<TOnMutateResult = unknown> extends Omit<
    UseMutationOptions<Awaited<ReturnType<typeof loginClient>>, Error, Parameters<typeof loginClient>[0], TOnMutateResult>,
    "mutationFn"
> {}

export function useLogin<TOnMutateResult = unknown>({ onMutate, onSuccess, onError, onSettled, ...rest }: UseLoginParams<TOnMutateResult> = {}) {
    const key = useId()

    return useMutation({
        mutationFn: loginClient,
        onMutate(variables, context) {
            message.open({
                key,
                type: "loading",
                content: "登录中...",
                duration: 0,
            })

            return onMutate?.(variables, context) as TOnMutateResult | Promise<TOnMutateResult>
        },
        onSuccess(data, variables, onMutateResult, context) {
            message.open({
                key,
                type: "success",
                content: "登录成功",
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
