import { FC } from "react"

import CurrentUserProfile from "@/components/CurrentUserProfile"

import { SystemSettingKey } from "@/constants/systemSettings"

import { getCurrentUser } from "@/server/getCurrentUser"
import { getBooleanSystemSettingValue } from "@/server/systemSettings"

const Page: FC = async () => {
    const [user, allowUpdateNickname, allowUpdatePhoneNumber] = await Promise.all([
        getCurrentUser(),
        getBooleanSystemSettingValue(SystemSettingKey.允许修改昵称),
        getBooleanSystemSettingValue(SystemSettingKey.允许修改手机号),
    ])

    if (!user) return null

    return <CurrentUserProfile data={user} allowUpdateNickname={allowUpdateNickname} allowUpdatePhoneNumber={allowUpdatePhoneNumber} />
}

export default Page
