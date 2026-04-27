import { createSharedFn } from "@/server/createSharedFn"
import { isAdmin } from "@/server/isAdmin"
import { queryPublicSystemSettingGroups } from "@/server/systemSettings"

export const querySystemSettings = createSharedFn({
    name: "querySystemSettings",
    filter: isAdmin,
})(async function querySystemSettings() {
    const groups = await queryPublicSystemSettingGroups()
    return groups
})
