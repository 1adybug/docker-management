import { assignFnName } from "deepsea-tools"

import { prisma } from "@/prisma"

import { AccountParams, accountSchema } from "@/schemas/account"
import { phoneNumberRegex } from "@/schemas/phoneNumber"

import { auth } from "@/server/auth"
import { createFilter } from "@/server/createFilter"
import { createRateLimit, RateLimitContext } from "@/server/createRateLimit"

import { ClientError } from "@/utils/clientError"

export interface SendPhoneNumberOtpResponse {
    phoneNumber: string
}

function getSendPhoneNumberOtpRateLimitKey(context: RateLimitContext) {
    const account = String(context.args[0] || "unknown-account")
    const ip = context.ip || "unknown-ip"
    return `send-phone-number-otp:${ip}:${account}`
}

export async function sendPhoneNumberOtp(params: AccountParams): Promise<SendPhoneNumberOtpResponse> {
    const user = await prisma.user.findUnique({
        where: phoneNumberRegex.test(params) ? { phoneNumber: params } : { name: params },
    })

    if (!user) throw new ClientError("用户名或手机号不存在")

    try {
        await auth.api.sendPhoneNumberOTP({
            body: {
                phoneNumber: user.phoneNumber,
            },
        })
    } catch (error) {
        throw new ClientError({
            message: "发送验证码失败",
            origin: error,
        })
    }

    return {
        phoneNumber: user.phoneNumber.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2"),
    }
}

assignFnName(sendPhoneNumberOtp, "sendPhoneNumberOtp")

sendPhoneNumberOtp.schema = accountSchema

sendPhoneNumberOtp.filter = createFilter(false)

sendPhoneNumberOtp.rateLimit = createRateLimit({
    limit: 1,
    windowMs: 60_000,
    message: "验证码发送过于频繁，请稍后再试",
    getKey: getSendPhoneNumberOtpRateLimitKey,
})
