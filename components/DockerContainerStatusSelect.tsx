import { createEnumSelect } from "soda-antd"

import { DockerContainerStatus } from "@/constants"

const DockerContainerStatusSelect = createEnumSelect(DockerContainerStatus)

export default DockerContainerStatusSelect
