import { useId } from "react"

import { withUseMutationDefaults } from "soda-tanstack-query"

import { uploadDockerImage } from "@/shared/uploadDockerImage"

export const createUseUploadDockerImage = withUseMutationDefaults<typeof uploadDockerImage>(() => {
    const key = useId()

    return {
        onMutate(variables, context) {
            message.open({
                key,
                type: "loading",
                content: "上传镜像中...",
                duration: 0,
            })
        },
        onSuccess(data, variables, onMutateResult, context) {
            context.client.invalidateQueries({ queryKey: ["query-docker-image"] })
            context.client.invalidateQueries({ queryKey: ["query-docker-image-detail"] })

            message.open({
                key,
                type: "success",
                content: "上传镜像成功",
            })
        },
        onError(error, variables, onMutateResult, context) {
            message.destroy(key)
        },
        onSettled(data, error, variables, onMutateResult, context) {},
    }
})
