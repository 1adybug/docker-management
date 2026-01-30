import { getParser } from "."
import { z } from "zod/v4"

import { dockerContainerCommandSchema } from "./dockerContainerCommand"
import { dockerContainerIdSchema } from "./dockerContainerId"

export const runDockerContainerSchema = z.object(
    {
        id: dockerContainerIdSchema,
        command: dockerContainerCommandSchema,
    },
    { message: "无效的容器参数" },
)

export type RunDockerContainerParams = z.infer<typeof runDockerContainerSchema>

export const runDockerContainerParser = getParser(runDockerContainerSchema)
