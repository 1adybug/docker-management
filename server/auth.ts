import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { nextCookies } from "better-auth/next-js"
import { admin } from "better-auth/plugins"
import { genericOAuth } from "better-auth/plugins/generic-oauth"
import { phoneNumber } from "better-auth/plugins/phone-number"

import { BetterAuthSecret, BetterAuthUrl, CookiePrefix, GeshuOAuthProviderId, IsDevelopment } from "@/constants"
import { SystemSettingKey } from "@/constants/systemSettings"

import { prisma } from "@/prisma"

import { phoneNumberRegex } from "@/schemas/phoneNumber"

import { setDevOtp } from "@/server/devOtpStore"
import { getGeshuOAuthConfig } from "@/server/geshuOAuth"
import { getTempEmail } from "@/server/getTempEmail"
import { getCachedSystemSettingValue, normalizeBooleanValue } from "@/server/systemSettings"

import { sendOtp } from "./sendOtp"

const DevPhoneOtp = "1234"

export interface PrintAuthOtpParams {
    phoneNumber: string
    code: string
}

function getAuthBaseUrl() {
    const baseUrl = BetterAuthUrl?.trim()
    if (baseUrl) return baseUrl
    return undefined
}

function getAuthSecret() {
    const secret = BetterAuthSecret?.trim()
    if (secret) return secret
    if (IsDevelopment) return "geshu-next-template-development-secret"
    throw new Error("缺少 BETTER_AUTH_SECRET 环境变量")
}

function isPrintAuthOtpEnabled() {
    try {
        return normalizeBooleanValue(getCachedSystemSettingValue(SystemSettingKey.打印验证码日志))
    } catch (error) {
        console.error("读取验证码日志打印设置失败", error)
        return false
    }
}

function printAuthOtp({ phoneNumber, code }: PrintAuthOtpParams) {
    if (!isPrintAuthOtpEnabled()) return

    console.log(`[auth-otp] 账户: ${phoneNumber}, 验证码: ${code}`)
}

const authBaseUrl = getAuthBaseUrl()
const authSecret = getAuthSecret()
const geshuOAuthConfig = getGeshuOAuthConfig()

export const auth = betterAuth({
    secret: authSecret,
    ...(authBaseUrl ? { baseURL: authBaseUrl } : {}),
    database: prismaAdapter(prisma, { provider: "sqlite" }),
    user: {
        additionalFields: {
            nickname: {
                type: "string",
                required: true,
            },
        },
    },
    advanced: {
        cookiePrefix: CookiePrefix,
    },
    emailAndPassword: {
        enabled: false,
    },
    account: {
        accountLinking: {
            trustedProviders: [GeshuOAuthProviderId],
            requireLocalEmailVerified: false,
            updateUserInfoOnLink: true,
        },
    },
    plugins: [
        admin(),
        genericOAuth({
            config: geshuOAuthConfig,
        }),
        phoneNumber({
            otpLength: 4,
            verifyOTP: IsDevelopment
                ? function verifyOTP({ code }) {
                      return code === DevPhoneOtp
                  }
                : undefined,
            phoneNumberValidator(phoneNumber) {
                return phoneNumberRegex.test(phoneNumber)
            },
            sendOTP({ phoneNumber, code }) {
                if (IsDevelopment) {
                    printAuthOtp({ phoneNumber, code: DevPhoneOtp })
                    setDevOtp({ phoneNumber }, DevPhoneOtp)
                    return
                }

                printAuthOtp({ phoneNumber, code })

                void sendOtp({ phoneNumber, code }).catch(error => void console.error("发送手机号验证码失败", error))
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
