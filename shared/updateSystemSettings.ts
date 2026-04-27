import { updateSystemSettingsSchema } from "@/schemas/updateSystemSettings"

import { syncAutoBackupScheduler } from "@/server/autoBackup"
import { createRateLimit } from "@/server/createRateLimit"
import { createSharedFn } from "@/server/createSharedFn"
import { isAdmin } from "@/server/isAdmin"
import { saveSystemSettings } from "@/server/systemSettings"

export const updateSystemSettings = createSharedFn({
    name: "updateSystemSettings",
    schema: updateSystemSettingsSchema,
    filter: isAdmin,
    rateLimit: createRateLimit({
        limit: 20,
        windowMs: 60_000,
        message: "系统设置保存过于频繁，请稍后再试",
    }),
})(async function updateSystemSettings(params) {
    const groups = await saveSystemSettings(params)
    await syncAutoBackupScheduler()

    return groups
})
