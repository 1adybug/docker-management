import { useId } from "react"

import { withUseMutationDefaults } from "soda-tanstack-query"

import { deleteProject } from "@/shared/deleteProject"

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

            message.open({
                key,
                type: "loading",
                content: notice.loading,
                duration: 0,
            })
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
        },
        onError(error, variables, onMutateResult, context) {
            message.destroy(key)
        },
        onSettled(data, error, variables, onMutateResult, context) {},
    }
})
