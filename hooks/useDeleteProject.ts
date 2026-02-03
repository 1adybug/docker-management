import { useId } from "react"

import { useMutation, UseMutationOptions } from "@tanstack/react-query"
import { createRequestFn } from "deepsea-tools"

import { deleteProjectAction } from "@/actions/deleteProject"

import { deleteProjectSchema } from "@/schemas/deleteProject"

/** 删除项目提示文本 */
export interface DeleteProjectNotice {
    loading: string
    success: string
}

function getDeleteProjectNotice(variables?: Parameters<typeof deleteProjectClient>[0]): DeleteProjectNotice {
    const isCleanup = variables?.cleanup

    if (isCleanup) {
        return {
            loading: "删除项目并清理容器中...",
            success: "删除项目并清理容器成功",
        }
    }

    return {
        loading: "删除项目中...",
        success: "删除项目成功",
    }
}

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
            const notice = getDeleteProjectNotice(variables)

            message.open({
                key,
                type: "loading",
                content: notice.loading,
                duration: 0,
            })

            return onMutate?.(variables, context) as TOnMutateResult | Promise<TOnMutateResult>
        },
        onSuccess(data, variables, onMutateResult, context) {
            const notice = getDeleteProjectNotice(variables)

            context.client.invalidateQueries({ queryKey: ["query-project"] })
            context.client.invalidateQueries({ queryKey: ["get-project", data.name] })

            message.open({
                key,
                type: "success",
                content: notice.success,
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
