import { useId } from "react"

import { useMutation, UseMutationOptions } from "@tanstack/react-query"
import { createRequestFn } from "deepsea-tools"

import { updateUserAction } from "@/actions/updateUser"

import { updateUserSchema } from "@/schemas/updateUser"

export const updateUserClient = createRequestFn({
    fn: updateUserAction,
    schema: updateUserSchema,
})

export interface UseUpdateUserParams<TOnMutateResult = unknown> extends Omit<
    UseMutationOptions<Awaited<ReturnType<typeof updateUserClient>>, Error, Parameters<typeof updateUserClient>[0], TOnMutateResult>,
    "mutationFn"
> {}

export function useUpdateUser<TOnMutateResult = unknown>({ onMutate, onSuccess, onError, onSettled, ...rest }: UseUpdateUserParams<TOnMutateResult> = {}) {
    const key = useId()

    return useMutation({
        mutationFn: updateUserClient,
        onMutate(variables, context) {
            message.open({
                key,
                type: "loading",
                content: "更新用户中...",
                duration: 0,
            })

            return onMutate?.(variables, context) as TOnMutateResult | Promise<TOnMutateResult>
        },
        onSuccess(data, variables, onMutateResult, context) {
            context.client.invalidateQueries({ queryKey: ["query-user"] })
            context.client.invalidateQueries({ queryKey: ["get-user", data.id] })

            message.open({
                key,
                type: "success",
                content: "更新用户成功",
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
