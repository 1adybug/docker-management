import { useId } from "react"

import { useMutation, UseMutationOptions } from "@tanstack/react-query"
import { createRequestFn } from "deepsea-tools"

import { deleteUserAction } from "@/actions/deleteUser"

export const deleteUserClient = createRequestFn(deleteUserAction)

export interface UseDeleteUserParams<TOnMutateResult = unknown> extends Omit<
    UseMutationOptions<Awaited<ReturnType<typeof deleteUserClient>>, Error, Parameters<typeof deleteUserClient>[0], TOnMutateResult>,
    "mutationFn"
> {}

export function useDeleteUser<TOnMutateResult = unknown>({ onMutate, onSuccess, onError, onSettled, ...rest }: UseDeleteUserParams<TOnMutateResult> = {}) {
    const key = useId()

    return useMutation({
        mutationFn: deleteUserClient,
        onMutate(variables, context) {
            message.open({
                key,
                type: "loading",
                content: "删除用户中...",
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
                content: "删除用户成功",
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
