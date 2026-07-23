import { useId } from "react"

import { withUseMutationDefaults } from "soda-tanstack-query"

import type { buildJarDockerImage } from "@/shared/buildJarDockerImage"

import { toast } from "@/utils/toast"

export const createUseBuildJarDockerImage = withUseMutationDefaults<typeof buildJarDockerImage>(() => {
    const key = useId()

    return {
        onMutate(variables, context) {
            toast.loading("制作 Jar 镜像中...", { id: key })
        },
        onSuccess(data, variables, onMutateResult, context) {
            if (!data.skipFollowUp) {
                context.client.invalidateQueries({ queryKey: ["query-docker-image"] })
                context.client.invalidateQueries({ queryKey: ["query-docker-image-detail"] })
            }

            const notify = data.skipMessage ? toast.warning : toast.success
            notify(data.skipMessage ?? "制作 Jar 镜像成功", { id: key })
        },
        onError(error, variables, onMutateResult, context) {
            toast.dismiss(key)
        },
        onSettled(data, error, variables, onMutateResult, context) {},
    }
})
