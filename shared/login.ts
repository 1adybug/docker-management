import { cookies } from "next/headers"

import { prisma } from "@/prisma"

import { LoginParams } from "@/schemas/login"

import { getUserFromAccount } from "@/server/getUserFromAccount"
import { sign } from "@/server/sign"

import { ClientError } from "@/utils/clientError"
import { getCookieKey } from "@/utils/getCookieKey"
import { redirectFromLogin } from "@/utils/redirectFromLogin"

export async function login({ account, captcha }: LoginParams) {
    const user = await getUserFromAccount(account)
    if (!user) throw new ClientError({ message: "用户不存在", code: 404 })
    const captchaStore = await prisma.captcha.findUnique({ where: { userId: user.id } })
    if (!captchaStore || captchaStore.expiredAt < new Date()) throw new ClientError({ message: "验证码不存在或已过期", code: 400 })
    if (captchaStore.code !== captcha) throw new ClientError({ message: "验证码错误", code: 400 })
    await prisma.captcha.delete({ where: { userId: user.id } })
    const token = await sign(user.id)
    const cookieStore = await cookies()
    cookieStore.set(getCookieKey("token"), token)
    await redirectFromLogin()
}

login.filter = false
