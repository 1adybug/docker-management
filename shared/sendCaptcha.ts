import { IsDevelopment, IsIntranet, IsProduction } from "@/constants"

import { prisma } from "@/prisma"

import { AccountParams } from "@/schemas/account"

import { getUserFromAccount } from "@/server/getUserFromAccount"
import { sendAliyunSms } from "@/server/sendAliyunSms"
import { sendQjpSms } from "@/server/sendQjpSms"

import { ClientError } from "@/utils/clientError"

export async function sendCaptcha(account: AccountParams) {
    const user = await getUserFromAccount(account)
    if (!user) throw new ClientError({ message: "用户不存在", code: 404 })
    const captcha = await prisma.captcha.findUnique({ where: { userId: user.id } })
    if (captcha && captcha.createdAt.valueOf() + 60 * 1000 > Date.now()) throw new ClientError({ message: "操作频繁，请稍后再试", code: 400 })
    const code = IsDevelopment ? "1234" : Math.random().toString().slice(2, 6).padEnd(4, "0")
    const expiresInMs = 5 * 60 * 1000

    if (IsProduction) {
        if (IsIntranet) {
            await sendQjpSms({
                phone: user.phone,
                content: `格数科技项目管理，你的登录验证码为 ${code}`,
            })
        } else {
            await sendAliyunSms({
                phone: user.phone,
                signName: "格数科技",
                templateCode: "SMS_478995533",
                params: { code },
            })
        }
    }

    await prisma.captcha.upsert({
        create: { userId: user.id, code, createdAt: new Date(), expiredAt: new Date(Date.now() + expiresInMs) },
        update: { code, createdAt: new Date(), expiredAt: new Date(Date.now() + expiresInMs) },
        where: { userId: user.id },
    })
    const masked = user.phone.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2")
    if (IsDevelopment) return `${masked}（开发环境验证码：${code}）`
    return masked
}

sendCaptcha.filter = false
