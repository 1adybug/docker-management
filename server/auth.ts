import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { nextCookies } from "better-auth/next-js"
import { admin } from "better-auth/plugins"
import { phoneNumber } from "better-auth/plugins/phone-number"

import { AuthBaseUrl, BetterAuthSecret, BetterAuthUrl, CookiePrefix, IsDevelopment } from "@/constants"

import { prisma } from "@/prisma"

import { phoneNumberRegex } from "@/schemas/phoneNumber"

import { setDevOtp } from "@/server/devOtpStore"
import { getTempEmail } from "@/server/getTempEmail"

import { sendOtp } from "./sendOtp"

function getAuthBaseUrl() {
    const baseUrl = BetterAuthUrl?.trim() || AuthBaseUrl?.trim()
    if (baseUrl) return baseUrl
    if (IsDevelopment) return "http://localhost:3000"
    return undefined
}

function getAuthSecret() {
    const secret = BetterAuthSecret?.trim()
    if (secret) return secret
    if (IsDevelopment) return "geshu-next-template-development-secret"
    throw new Error("缺少 BETTER_AUTH_SECRET 环境变量")
}

const authBaseUrl = getAuthBaseUrl()
const authSecret = getAuthSecret()

export const auth = betterAuth({
    secret: authSecret,
    ...(authBaseUrl ? { baseURL: authBaseUrl } : {}),
    database: prismaAdapter(prisma, { provider: "sqlite" }),
    advanced: {
        cookiePrefix: CookiePrefix,
    },
    emailAndPassword: {
        enabled: false,
    },
    plugins: [
        admin(),
        phoneNumber({
            otpLength: 4,
            phoneNumberValidator(phoneNumber) {
                return phoneNumberRegex.test(phoneNumber)
            },
            sendOTP({ phoneNumber, code }) {
                if (IsDevelopment) {
                    console.log(`手机号验证码: ${phoneNumber} -> ${code}`)
                    setDevOtp({ phoneNumber }, code)
                    return
                }

                void sendOtp({ phoneNumber, code }).catch(error => {
                    console.error("发送手机号验证码失败", error)
                })
            },
            signUpOnVerification: {
                getTempEmail,
                getTempName(phoneNumber) {
                    return phoneNumber
                },
            },
        }),
        nextCookies(),
    ],
})
