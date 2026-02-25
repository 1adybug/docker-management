import { createEnumSelect } from "soda-antd"

import { UserRole } from "@/schemas/userRole"

const RoleSelect = createEnumSelect(UserRole)

export default RoleSelect
