import { useId } from "react"

import { withUseMutationDefaults } from "soda-tanstack-query"

import { pullDockerImage } from "@/shared/pullDockerImage"

export const createUsePullDockerImage = withUseMutationDefaults<typeof pullDockerImage>(() => {
    const key = useId()

    return {
        onMutate(variables, context) {
            message.open({
                key,
                type: "loading",
                content: "拉取镜像中...",
                duration: 0,
            })
        },
        onSuccess(data, variables, onMutateResult, context) {
            if (!data.skipFollowUp) {
                context.client.invalidateQueries({ queryKey: ["query-docker-image"] })
                context.client.invalidateQueries({ queryKey: ["query-docker-image-detail"] })
            }

            message.open({
                key,
                type: data.skipMessage ? "warning" : "success",
                content: data.skipMessage ?? "拉取镜像成功",
            })
        },
        onError(error, variables, onMutateResult, context) {
            message.destroy(key)
        },
        onSettled(data, error, variables, onMutateResult, context) {},
    }
})
