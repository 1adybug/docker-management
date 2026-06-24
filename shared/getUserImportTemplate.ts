import { createSharedFn } from "@/server/createSharedFn"
import { isAdmin } from "@/server/isAdmin"
import { createUserImportTemplateWorkbook } from "@/server/userWorkbook"

export const getUserImportTemplate = createSharedFn({
    name: "getUserImportTemplate",
    filter: isAdmin,
})(async function getUserImportTemplate() {
    return createUserImportTemplateWorkbook()
})
