import { useId } from "react"

import { withUseMutationDefaults } from "soda-tanstack-query"

import { deleteDockerImage } from "@/shared/deleteDockerImage"

export const createUseDeleteDockerImage = withUseMutationDefaults<typeof deleteDockerImage>(() => {
    const key = useId()

    return {
        onMutate(variables, context) {
            message.open({
                key,
                type: "loading",
                content: "删除镜像中...",
                duration: 0,
            })
        },
        onSuccess(data, variables, onMutateResult, context) {
            context.client.invalidateQueries({ queryKey: ["query-docker-image-detail"] })
            context.client.invalidateQueries({ queryKey: ["query-docker-container"] })

            message.open({
                key,
                type: "success",
                content: "删除镜像成功",
            })
        },
        onError(error, variables, onMutateResult, context) {
            message.destroy(key)
        },
        onSettled(data, error, variables, onMutateResult, context) {},
    }
})
