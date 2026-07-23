import { useId } from "react"

import { withUseMutationDefaults } from "soda-tanstack-query"

import type { deleteDockerImage } from "@/shared/deleteDockerImage"

import { toast } from "@/utils/toast"

export const createUseDeleteDockerImage = withUseMutationDefaults<typeof deleteDockerImage>(() => {
    const key = useId()

    return {
        onMutate(variables, context) {
            toast.loading("删除镜像中...", { id: key })
        },
        onSuccess(data, variables, onMutateResult, context) {
            context.client.invalidateQueries({ queryKey: ["query-docker-image"] })
            context.client.invalidateQueries({ queryKey: ["query-docker-image-detail"] })
            context.client.invalidateQueries({ queryKey: ["query-docker-container"] })

            toast.success("删除镜像成功", { id: key })
        },
        onError(error, variables, onMutateResult, context) {
            toast.dismiss(key)
        },
        onSettled(data, error, variables, onMutateResult, context) {},
    }
})
