import type { FC } from "react"

import type { Metadata } from "next"

import { CurrentUserProfile } from "@/components/CurrentUserProfile"

import { GeshuAgentOAuthProviderId } from "@/constants"
import { SystemSettingKey } from "@/constants/systemSettings"

import { prisma } from "@/prisma"

import { getCurrentUser } from "@/server/getCurrentUser"
import { getBooleanSystemSettingValue } from "@/server/systemSettings"

export const metadata: Metadata = {
    title: "个人中心",
}

const Page: FC = async () => {
    const [user, allowUpdateNickname, allowUpdatePhoneNumber] = await Promise.all([
        getCurrentUser(),
        getBooleanSystemSettingValue(SystemSettingKey.允许修改昵称),
        getBooleanSystemSettingValue(SystemSettingKey.允许修改手机号),
    ])

    if (!user) return null

    const geshuAgentOAuthAccount = await prisma.account.findFirst({
        where: {
            userId: user.id,
            providerId: GeshuAgentOAuthProviderId,
        },
        select: { id: true },
    })

    return (
        <CurrentUserProfile
            data={user}
            allowUpdateNickname={allowUpdateNickname}
            allowUpdatePhoneNumber={allowUpdatePhoneNumber}
            geshuAgentOAuthAccountId={geshuAgentOAuthAccount?.id}
        />
    )
}

export default Page
