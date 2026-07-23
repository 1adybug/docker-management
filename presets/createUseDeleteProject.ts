import { useId } from "react"

import { withUseMutationDefaults } from "soda-tanstack-query"

import type { deleteProject } from "@/shared/deleteProject"

import { toast } from "@/utils/toast"

/** 删除项目提示文本 */
export interface DeleteProjectNotice {
    loading: string
    success: string
}

function getDeleteProjectNotice(variables?: Parameters<typeof deleteProject>[0]): DeleteProjectNotice {
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

export const createUseDeleteProject = withUseMutationDefaults<typeof deleteProject>(() => {
    const key = useId()

    return {
        onMutate(variables, context) {
            const notice = getDeleteProjectNotice(variables)

            toast.loading(notice.loading, { id: key })
        },
        onSuccess(data, variables, onMutateResult, context) {
            const notice = getDeleteProjectNotice(variables)

            context.client.invalidateQueries({ queryKey: ["query-project"] })
            context.client.invalidateQueries({ queryKey: ["get-project", data.name] })
            context.client.invalidateQueries({ queryKey: ["query-docker-image-detail"] })
            context.client.invalidateQueries({ queryKey: ["query-docker-container"] })

            toast.success(notice.success, { id: key })
        },
        onError(error, variables, onMutateResult, context) {
            toast.dismiss(key)
        },
        onSettled(data, error, variables, onMutateResult, context) {},
    }
})
