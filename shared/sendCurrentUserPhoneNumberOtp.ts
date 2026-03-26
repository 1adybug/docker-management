import { AllowCurrentUserUpdatePhoneNumber } from "@/constants"

import { prisma } from "@/prisma"

import { SendCurrentUserPhoneNumberOtpParams, sendCurrentUserPhoneNumberOtpSchema } from "@/schemas/sendCurrentUserPhoneNumberOtp"

import { auth } from "@/server/auth"
import { createRateLimit, RateLimitContext } from "@/server/createRateLimit"
import { createSharedFn } from "@/server/createSharedFn"
import { getCurrentUser } from "@/server/getCurrentUser"

import { ClientError } from "@/utils/clientError"

export interface SendCurrentUserPhoneNumberOtpResponse {
    phoneNumber: string
}

function getSendCurrentUserPhoneNumberOtpRateLimitKey(context: RateLimitContext) {
    const params = context.args[0] as SendCurrentUserPhoneNumberOtpParams | undefined
    const userId = context.user?.id || "unknown-user"
    const phoneNumber = params?.phoneNumber || "unknown-phone-number"
    const ip = context.ip || "unknown-ip"
    return `send-current-user-phone-number-otp:${userId}:${ip}:${phoneNumber}`
}

export const sendCurrentUserPhoneNumberOtp = createSharedFn({
    name: "sendCurrentUserPhoneNumberOtp",
    schema: sendCurrentUserPhoneNumberOtpSchema,
    rateLimit: createRateLimit({
        limit: 1,
        windowMs: 60_000,
        message: "验证码发送过于频繁，请稍后再试",
        getKey: getSendCurrentUserPhoneNumberOtpRateLimitKey,
    }),
})(async function sendCurrentUserPhoneNumberOtp({ phoneNumber }): Promise<SendCurrentUserPhoneNumberOtpResponse> {
    const user = await getCurrentUser()
    if (!user) throw new ClientError({ message: "请先登录", code: 401 })

    if (!AllowCurrentUserUpdatePhoneNumber) throw new ClientError("当前环境不允许用户修改手机号")

    if (phoneNumber !== user.phoneNumber) {
        const count = await prisma.user.count({
            where: {
                phoneNumber,
                id: { not: user.id },
            },
        })

        if (count > 0) throw new ClientError("手机号已存在")
    }

    try {
        await auth.api.sendPhoneNumberOTP({
            body: {
                phoneNumber,
            },
        })
    } catch (error) {
        throw new ClientError({
            message: "发送验证码失败",
            origin: error,
        })
    }

    return {
        phoneNumber: phoneNumber.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2"),
    }
})
