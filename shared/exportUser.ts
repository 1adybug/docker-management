import { prisma } from "@/prisma"
import { defaultUserSelect } from "@/prisma/getUserSelect"

import { type ExportUserParams, exportUserSchema } from "@/schemas/exportUser"

import { createSharedFn } from "@/server/createSharedFn"
import { isAdmin } from "@/server/isAdmin"
import { createUserExportWorkbook } from "@/server/userWorkbook"

import { getQueryUserOrderBy, getQueryUserWhere } from "./queryUser"

export const exportUser = createSharedFn({
    name: "exportUser",
    schema: exportUserSchema,
    filter: isAdmin,
})(async function exportUser(params: ExportUserParams) {
    const data = await prisma.user.findMany({
        where: getQueryUserWhere(params),
        select: defaultUserSelect,
        orderBy: getQueryUserOrderBy(params),
    })

    return createUserExportWorkbook(data)
})
