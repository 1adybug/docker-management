import { createEnumSelect } from "soda-antd"

import { DockerContainerStatus } from "@/constants"

export const DockerContainerStatusSelect = createEnumSelect(DockerContainerStatus)
