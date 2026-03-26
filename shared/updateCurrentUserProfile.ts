import { headers } from "next/headers"

import { AllowCurrentUserUpdateNickname, AllowCurrentUserUpdatePhoneNumber } from "@/constants"

import { prisma } from "@/prisma"

import { updateCurrentUserProfileSchema } from "@/schemas/updateCurrentUserProfile"

import { auth } from "@/server/auth"
import { createRateLimit, RateLimitContext } from "@/server/createRateLimit"
import { createSharedFn } from "@/server/createSharedFn"
import { getCurrentUser } from "@/server/getCurrentUser"

import { ClientError } from "@/utils/clientError"

function getUpdateCurrentUserProfileRateLimitKey(context: RateLimitContext) {
    const userId = context.user?.id || "unknown-user"
    const ip = context.ip || "unknown-ip"
    return `update-current-user-profile:${userId}:${ip}`
}

export const updateCurrentUserProfile = createSharedFn({
    name: "updateCurrentUserProfile",
    schema: updateCurrentUserProfileSchema,
    rateLimit: createRateLimit({
        limit: 10,
        windowMs: 60_000,
        message: "资料更新过于频繁，请稍后再试",
        getKey: getUpdateCurrentUserProfileRateLimitKey,
    }),
})(async function updateCurrentUserProfile({ nickname, phoneNumber, oldOtp, newOtp }) {
    const user = await getCurrentUser()
    if (!user) throw new ClientError({ message: "请先登录", code: 401 })

    const requestHeaders = await headers()
    const isPhoneNumberChanged = phoneNumber !== user.phoneNumber
    const isNicknameChanged = nickname !== user.nickname

    if (isPhoneNumberChanged && !AllowCurrentUserUpdatePhoneNumber) throw new ClientError("当前环境不允许用户修改手机号")

    if (isNicknameChanged && !AllowCurrentUserUpdateNickname) throw new ClientError("当前环境不允许用户修改昵称")

    if (isPhoneNumberChanged) {
        if (!oldOtp || !newOtp) throw new ClientError("修改手机号时，请填写新旧手机号验证码")

        const count = await prisma.user.count({
            where: {
                phoneNumber,
                id: { not: user.id },
            },
        })

        if (count > 0) throw new ClientError("手机号已存在")

        try {
            await auth.api.verifyPhoneNumber({
                body: {
                    phoneNumber: user.phoneNumber,
                    code: oldOtp,
                },
                headers: requestHeaders,
            })
        } catch (error) {
            throw new ClientError({
                message: "原手机号验证码错误",
                origin: error,
            })
        }

        try {
            await auth.api.verifyPhoneNumber({
                body: {
                    phoneNumber,
                    code: newOtp,
                    updatePhoneNumber: true,
                },
                headers: requestHeaders,
            })
        } catch (error) {
            throw new ClientError({
                message: "新手机号验证码错误",
                origin: error,
            })
        }
    }

    if (isNicknameChanged) {
        try {
            await auth.api.updateUser({
                body: {
                    nickname,
                },
                headers: requestHeaders,
            })
        } catch (error) {
            throw new ClientError({
                message: "更新昵称失败",
                origin: error,
            })
        }
    }

    const nextUser = await prisma.user.findUnique({ where: { id: user.id } })
    if (!nextUser) throw new ClientError("用户不存在")

    return nextUser
})
