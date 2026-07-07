import { createEnumSelect } from "soda-antd"

import { UserRole } from "@/schemas/userRole"

export const RoleSelect = createEnumSelect(UserRole)
