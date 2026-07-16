"use client"

import { type FC, useEffect, useId, useState } from "react"

import { useForm } from "@tanstack/react-form"
import { getErrorMessage } from "deepsea-tools"
import { LoaderCircleIcon } from "lucide-react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldError, FieldGroup } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

import { GeshuOAuthProviderId } from "@/constants"

import { useLogin } from "@/hooks/useLogin"
import { useQueryGeshuOAuthLoginStatus } from "@/hooks/useQueryGeshuOAuthLoginStatus"
import { useSendPhoneNumberOtp } from "@/hooks/useSendPhoneNumberOtp"

import { accountParser, accountSchema } from "@/schemas/account"
import { loginParser, loginSchema } from "@/schemas/login"
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

    const form = useForm({
        defaultValues: {
            account: "",
            otp: "",
        },
        validators: {
            onSubmit: loginSchema,
        },
        async onSubmit({ value }) {
            await login(loginParser(value))
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
        toast.error(getOAuthLoginErrorMessage(error, description), { id: key })

        const nextSearchParams = new URLSearchParams(searchParams)
        nextSearchParams.delete("error")
        nextSearchParams.delete("error_description")

        const search = nextSearchParams.toString()
        window.history.replaceState(null, "", search ? `${pathname}?${search}` : pathname)
    }, [key, pathname, searchParams])

    async function sendOtp() {
        try {
            await sendPhoneNumberOtp(accountParser(form.getFieldValue("account")))
        } catch (error) {
            toast.error(getErrorMessage(error))
        }
    }

    async function onOAuthLogin() {
        if (isOAuthLoginPending) return

        if (!geshuOAuthLoginStatus?.ready) {
            toast.error("暂时无法使用格数账号登录，请联系管理员处理。")
            return
        }

        setIsOAuthLoginPending(true)
        toast.loading("正在跳转账号平台...", { id: key, duration: Infinity })

        try {
            const response = await authClient.signIn.oauth2({
                providerId: GeshuOAuthProviderId,
                callbackURL: "/",
                errorCallbackURL: "/login",
            })

            if (response.error) throw new Error(response.error.message || "账号平台登录失败")
            toast.dismiss(key)
        } catch (error) {
            toast.error(getErrorMessage(error), { id: key })
        } finally {
            setIsOAuthLoginPending(false)
        }
    }

    const isOAuthLoginVisible = geshuOAuthLoginStatus?.enabled === true
    const isOAuthLoginReady = geshuOAuthLoginStatus?.ready === true

    return (
        <Card>
            <CardHeader>
                <CardTitle>登录</CardTitle>
                <CardDescription>使用手机号验证码或格数账号进入系统。</CardDescription>
            </CardHeader>
            <CardContent>
                <form
                    id="login-form"
                    className="space-y-4"
                    onSubmit={event => {
                        event.preventDefault()
                        event.stopPropagation()
                        void form.handleSubmit()
                    }}
                >
                    <FieldGroup>
                        <form.Field name="account" validators={{ onBlur: accountSchema }}>
                            {field => {
                                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
                                return (
                                    <Field data-invalid={isInvalid}>
                                        <Input
                                            id={field.name}
                                            name={field.name}
                                            placeholder="用户名或手机号"
                                            autoComplete="username"
                                            aria-invalid={isInvalid}
                                            value={field.state.value}
                                            onBlur={field.handleBlur}
                                            onChange={event => field.handleChange(event.target.value)}
                                        />
                                        {isInvalid && <FieldError errors={field.state.meta.errors} />}
                                    </Field>
                                )
                            }}
                        </form.Field>
                        <div className="flex items-start gap-2">
                            <form.Field name="otp" validators={{ onBlur: otpSchema }}>
                                {field => {
                                    const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
                                    return (
                                        <Field className="min-w-0 flex-auto" data-invalid={isInvalid}>
                                            <Input
                                                id={field.name}
                                                name={field.name}
                                                inputMode="numeric"
                                                placeholder="验证码"
                                                autoComplete="one-time-code"
                                                aria-invalid={isInvalid}
                                                value={field.state.value}
                                                onBlur={field.handleBlur}
                                                onChange={event => field.handleChange(event.target.value)}
                                            />
                                            {isInvalid && <FieldError errors={field.state.meta.errors} />}
                                        </Field>
                                    )
                                }}
                            </form.Field>
                            <Button
                                className="w-32 flex-none"
                                type="button"
                                variant="outline"
                                disabled={left > 0 || isSendPhoneNumberOtpPending}
                                onClick={() => void sendOtp()}
                            >
                                {isSendPhoneNumberOtpPending && <LoaderCircleIcon className="animate-spin" />}
                                {left > 0 ? `${left} 秒` : "发送验证码"}
                            </Button>
                        </div>
                    </FieldGroup>
                    <form.Subscribe selector={state => [state.canSubmit, state.isSubmitting, state.isPristine]}>
                        {([canSubmit, isSubmitting, isPristine]) => (
                            <Button className="w-full" type="submit" disabled={!canSubmit || isSubmitting || isLoginPending || isPristine}>
                                {(isSubmitting || isLoginPending) && <LoaderCircleIcon className="animate-spin" />}
                                登录
                            </Button>
                        )}
                    </form.Subscribe>
                    {isOAuthLoginVisible && (
                        <Button
                            className="w-full"
                            type="button"
                            variant="outline"
                            title={isOAuthLoginReady ? undefined : "暂时无法使用格数账号登录"}
                            disabled={!isOAuthLoginReady || isOAuthLoginPending}
                            onClick={() => void onOAuthLogin()}
                        >
                            {isOAuthLoginPending && <LoaderCircleIcon className="animate-spin" />}
                            格数账号登录
                        </Button>
                    )}
                </form>
            </CardContent>
        </Card>
    )
}

export default Page
