import { assignFnName } from "deepsea-tools"

import { getCurrentUser } from "@/server/getCurrentUser"

import { ClientError } from "@/utils/clientError"

export async function getUserOwn() {
    const user = await getCurrentUser()
    if (!user) throw new ClientError({ message: "请先登录", code: 401 })
    return user
}

assignFnName(getUserOwn, "getUserOwn")
