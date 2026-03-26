import { FC } from "react"

import CurrentUserProfile from "@/components/CurrentUserProfile"

import { AllowCurrentUserUpdateNickname, AllowCurrentUserUpdatePhoneNumber } from "@/constants"

import { getCurrentUser } from "@/server/getCurrentUser"

const Page: FC = async () => {
    const user = await getCurrentUser()
    if (!user) return null

    return <CurrentUserProfile data={user} allowUpdateNickname={AllowCurrentUserUpdateNickname} allowUpdatePhoneNumber={AllowCurrentUserUpdatePhoneNumber} />
}

export default Page
