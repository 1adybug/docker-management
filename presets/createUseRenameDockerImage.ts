import { useId } from "react"

import { withUseMutationDefaults } from "soda-tanstack-query"

import type { renameDockerImage } from "@/shared/renameDockerImage"

import { toast } from "@/utils/toast"

export const createUseRenameDockerImage = withUseMutationDefaults<typeof renameDockerImage>(() => {
    const key = useId()

    return {
        onMutate(variables, context) {
            toast.loading("重命名镜像中...", { id: key })
        },
        onSuccess(data, variables, onMutateResult, context) {
            context.client.invalidateQueries({ queryKey: ["query-docker-image"] })
            context.client.invalidateQueries({ queryKey: ["query-docker-image-detail"] })
            context.client.invalidateQueries({ queryKey: ["query-docker-container"] })

            toast.success("重命名镜像成功", { id: key })
        },
        onError(error, variables, onMutateResult, context) {
            toast.dismiss(key)
        },
        onSettled(data, error, variables, onMutateResult, context) {},
    }
})
