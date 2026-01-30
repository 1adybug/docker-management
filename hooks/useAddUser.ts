import { useId } from "react"

import { useMutation, UseMutationOptions } from "@tanstack/react-query"
import { createRequestFn } from "deepsea-tools"

import { addUserAction } from "@/actions/addUser"

import { addUserSchema } from "@/schemas/addUser"

export const addUserClient = createRequestFn({
    fn: addUserAction,
    schema: addUserSchema,
})

export interface UseAddUserParams<TOnMutateResult = unknown> extends Omit<
    UseMutationOptions<Awaited<ReturnType<typeof addUserClient>>, Error, Parameters<typeof addUserClient>[0], TOnMutateResult>,
    "mutationFn"
> {}

export function useAddUser<TOnMutateResult = unknown>({ onMutate, onSuccess, onError, onSettled, ...rest }: UseAddUserParams<TOnMutateResult> = {}) {
    const key = useId()

    return useMutation({
        mutationFn: addUserClient,
        onMutate(variables, context) {
            message.open({
                key,
                type: "loading",
                content: "新增用户中...",
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
                content: "新增用户成功",
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
