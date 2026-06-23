"use client"

import { type FC, useEffect, useId, useState } from "react"

import { Button, Form, Input } from "antd"
import { useForm } from "antd/es/form/Form"
import FormItem from "antd/es/form/FormItem"
import { getErrorMessage } from "deepsea-tools"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { schemaToRule } from "soda-antd"

import { GeshuOAuthProviderId } from "@/constants"

import { useLogin } from "@/hooks/useLogin"
import { useQueryGeshuOAuthLoginStatus } from "@/hooks/useQueryGeshuOAuthLoginStatus"
import { useSendPhoneNumberOtp } from "@/hooks/useSendPhoneNumberOtp"

import { accountSchema } from "@/schemas/account"
import type { LoginParams } from "@/schemas/login"
import { otpSchema } from "@/schemas/otp"

import { authClient } from "@/utils/authClient"

const OAuthLoginErrorMessage = {
    signup_disabled: "当前手机号还不能登录本系统，请联系管理员先为你开通账号。",
    account_not_linked: "当前格数账号暂时还不能登录本系统，请联系管理员确认账号状态。",
    unable_to_link_account: "账号关联没有成功，请稍后再试，或联系管理员帮你处理。",
    oauth_code_verification_failed: "本次登录已失效，请重新尝试登录。",
    user_info_is_missing: "没有获取到账户信息，请重新登录。若仍然失败，请联系管理员。",
    email_is_missing: "没有获取到必要的账户信息，请联系管理员确认账号状态。",
    id_is_missing: "没有获取到必要的账户信息，请联系管理员确认账号状态。",
    name_is_missing: "没有获取到必要的账户信息，请联系管理员确认账号状态。",
    issuer_mismatch: "格数账号登录暂时不可用，请联系管理员处理。",
    issuer_missing: "格数账号登录暂时不可用，请联系管理员处理。",
} as const

function getOAuthLoginErrorMessage(error: string, description?: string) {
    return OAuthLoginErrorMessage[error as keyof typeof OAuthLoginErrorMessage] || description || "格数账号登录没有成功，请重新尝试。"
}

const Page: FC = () => {
    const key = useId()
    const pathname = usePathname()
    const router = useRouter()
    const searchParams = useSearchParams()
    const [form] = useForm<LoginParams>()
    const [left, setLeft] = useState(0)
    const [isOAuthLoginPending, setIsOAuthLoginPending] = useState(false)

    const { data: geshuOAuthLoginStatus } = useQueryGeshuOAuthLoginStatus()

    const { mutateAsync: sendPhoneNumberOtp, isPending: isSendPhoneNumberOtpPending } = useSendPhoneNumberOtp({
        onSuccess() {
            setLeft(60)
        },
    })

    const { mutateAsync: login, isPending: isLoginPending } = useLogin({
        onSuccess() {
            router.refresh()
        },
    })

    useEffect(() => {
        if (left === 0) return
        const timeout = setTimeout(() => setLeft(Math.max(0, left - 1)), 1000)
        return () => clearTimeout(timeout)
    }, [left])

    useEffect(() => {
        const error = searchParams.get("error")
        if (!error) return

        const description = searchParams.get("error_description") ?? undefined

        message.open({
            key,
            type: "error",
            content: getOAuthLoginErrorMessage(error, description),
        })

        const nextSearchParams = new URLSearchParams(searchParams)
        nextSearchParams.delete("error")
        nextSearchParams.delete("error_description")

        const search = nextSearchParams.toString()
        const nextPathname = search ? `${pathname}?${search}` : pathname

        window.history.replaceState(null, "", nextPathname)
    }, [key, pathname, searchParams])

    function sendOtp() {
        sendPhoneNumberOtp(form.getFieldValue("account"))
    }

    async function onOAuthLogin() {
        if (isOAuthLoginPending) return

        if (!geshuOAuthLoginStatus?.ready) {
            message.open({
                key,
                type: "error",
                content: "暂时无法使用格数账号登录，请联系管理员处理。",
            })

            return
        }

        setIsOAuthLoginPending(true)

        message.open({
            key,
            type: "loading",
            content: "正在跳转账号平台...",
            duration: 0,
        })

        try {
            const response = await authClient.signIn.oauth2({
                providerId: GeshuOAuthProviderId,
                callbackURL: "/",
                errorCallbackURL: "/login",
            })

            if (response.error) throw new Error(response.error.message || "账号平台登录失败")

            message.destroy(key)
        } catch (error) {
            message.open({
                key,
                type: "error",
                content: getErrorMessage(error),
            })
        } finally {
            setIsOAuthLoginPending(false)
        }
    }

    const isOAuthLoginVisible = geshuOAuthLoginStatus?.enabled === true
    const isOAuthLoginReady = geshuOAuthLoginStatus?.ready === true

    return (
        <Form<LoginParams> name="login-form" form={form} className="!mx-auto flex w-64 flex-col" onFinish={login} disabled={isLoginPending}>
            <FormItem<LoginParams> name="account" rules={[schemaToRule(accountSchema)]}>
                <Input placeholder="用户名或手机号" autoComplete="off" />
            </FormItem>
            <div className="flex gap-2">
                <FormItem<LoginParams> name="otp" rules={[schemaToRule(otpSchema)]}>
                    <Input placeholder="验证码" autoComplete="off" />
                </FormItem>
                <Button className="w-[112px] flex-none" onClick={sendOtp} loading={isSendPhoneNumberOtpPending} disabled={left > 0}>
                    {left > 0 ? `${left} 秒后重试` : "发送验证码"}
                </Button>
            </div>
            <Button className="mt-4" type="primary" block disabled={isLoginPending} htmlType="submit">
                登录
            </Button>
            {isOAuthLoginVisible && (
                <Button
                    className="mt-4"
                    block
                    title={isOAuthLoginReady ? undefined : "暂时无法使用格数账号登录"}
                    loading={isOAuthLoginPending}
                    disabled={!isOAuthLoginReady}
                    onClick={onOAuthLogin}
                >
                    格数账号登录
                </Button>
            )}
        </Form>
    )
}

export default Page
