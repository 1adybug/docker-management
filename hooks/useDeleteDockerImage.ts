import { useId } from "react"

import { useMutation, UseMutationOptions } from "@tanstack/react-query"
import { createRequestFn } from "deepsea-tools"

import { deleteDockerImageAction } from "@/actions/deleteDockerImage"

import { deleteDockerImageSchema } from "@/schemas/deleteDockerImage"

export const deleteDockerImageClient = createRequestFn({
    fn: deleteDockerImageAction,
    schema: deleteDockerImageSchema,
})

export interface UseDeleteDockerImageParams<TOnMutateResult = unknown> extends Omit<
    UseMutationOptions<Awaited<ReturnType<typeof deleteDockerImageClient>>, Error, Parameters<typeof deleteDockerImageClient>[0], TOnMutateResult>,
    "mutationFn"
> {}

export function useDeleteDockerImage<TOnMutateResult = unknown>({
    onMutate,
    onSuccess,
    onError,
    onSettled,
    ...rest
}: UseDeleteDockerImageParams<TOnMutateResult> = {}) {
    const key = useId()

    return useMutation({
        mutationFn: deleteDockerImageClient,
        onMutate(variables, context) {
            message.open({
                key,
                type: "loading",
                content: "删除镜像中...",
                duration: 0,
            })

            return onMutate?.(variables, context) as TOnMutateResult | Promise<TOnMutateResult>
        },
        onSuccess(data, variables, onMutateResult, context) {
            context.client.invalidateQueries({ queryKey: ["query-docker-image-detail"] })
            context.client.invalidateQueries({ queryKey: ["query-docker-container"] })

            message.open({
                key,
                type: "success",
                content: "删除镜像成功",
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
