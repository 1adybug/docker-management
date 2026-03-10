import { prisma } from "@/prisma"

import { LoginParams, loginSchema } from "@/schemas/login"
import { phoneNumberRegex } from "@/schemas/phoneNumber"

import { auth } from "@/server/auth"
import { createRateLimit, RateLimitContext } from "@/server/createRateLimit"
import { createSharedFn } from "@/server/createSharedFn"

import { ClientError } from "@/utils/clientError"

function getLoginRateLimitKey(context: RateLimitContext) {
    const params = context.args[0] as LoginParams | undefined
    const account = params?.account || "unknown-account"
    const ip = context.ip || "unknown-ip"
    return `login:${ip}:${account}`
}

export const login = createSharedFn({
    name: "login",
    schema: loginSchema,
    filter: false,
    rateLimit: createRateLimit({
        limit: 5,
        windowMs: 60_000,
        message: "登录尝试过于频繁，请稍后再试",
        getKey: getLoginRateLimitKey,
    }),
})(async function login({ account, otp }) {
    const user = await prisma.user.findUnique({
        where: phoneNumberRegex.test(account) ? { phoneNumber: account } : { name: account },
    })

    if (!user) throw new ClientError("账号或验证码错误")

    try {
        await auth.api.verifyPhoneNumber({
            body: {
                phoneNumber: user.phoneNumber,
                code: otp,
            },
        })
    } catch (error) {
        throw new ClientError({
            message: "账号或验证码错误",
            origin: error,
        })
    }

    return user
})
