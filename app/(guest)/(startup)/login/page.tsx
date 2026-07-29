"use client"

import { type FC, useEffect, useId, useState } from "react"

import { getErrorMessage } from "deepsea-tools"
import { LoaderCircleIcon } from "lucide-react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { PhoneLoginForm } from "@/components/PhoneLoginForm"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

import { GeshuAgentOAuthProviderId, GeshuOAuthProviderId } from "@/constants"

import { useQueryGeshuAgentOAuthLoginStatus } from "@/hooks/useQueryGeshuAgentOAuthLoginStatus"
import { useQueryGeshuOAuthLoginStatus } from "@/hooks/useQueryGeshuOAuthLoginStatus"

import { authClient } from "@/utils/authClient"
import { getSafeInternalCallbackUrl } from "@/utils/getSafeInternalCallbackUrl"
import { toast } from "@/utils/toast"

const GeshuOAuthLoginErrorMessage = {
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

const GeshuAgentOAuthLoginErrorMessage = {
    signup_disabled: "该 geshu-agent 账户尚未绑定本平台账户。请先使用手机号登录，再完成绑定。",
    account_not_linked: "该 geshu-agent 账户尚未绑定本平台账户。请先使用手机号登录，再完成绑定。",
    unable_to_link_account: "geshu-agent 账户关联没有成功，请稍后再试。",
    oauth_code_verification_failed: "本次登录已失效，请重新尝试登录。",
    user_info_is_missing: "geshu-agent 没有返回账户标识，请重新登录。",
    email_is_missing: "geshu-agent 登录返回的数据不完整，请联系管理员处理。",
    id_is_missing: "geshu-agent 没有返回标准 sub，请联系管理员处理。",
    name_is_missing: "geshu-agent 登录返回的数据不完整，请联系管理员处理。",
    issuer_mismatch: "geshu-agent 登录响应来源不正确，请联系管理员处理。",
    issuer_missing: "geshu-agent 登录响应缺少来源标识，请联系管理员处理。",
} as const

function getOAuthLoginErrorMessage(providerId: string | null, error: string, description?: string) {
    if (providerId === GeshuAgentOAuthProviderId) {
        return (
            GeshuAgentOAuthLoginErrorMessage[error as keyof typeof GeshuAgentOAuthLoginErrorMessage] || description || "geshu-agent 登录没有成功，请重新尝试。"
        )
    }

    return GeshuOAuthLoginErrorMessage[error as keyof typeof GeshuOAuthLoginErrorMessage] || description || "格数账号登录没有成功，请重新尝试。"
}

const Page: FC = () => {
    const toastId = useId()
    const pathname = usePathname()
    const router = useRouter()
    const searchParams = useSearchParams()
    const [pendingProviderId, setPendingProviderId] = useState<string>()

    const { data: geshuOAuthLoginStatus } = useQueryGeshuOAuthLoginStatus()
    const { data: geshuAgentOAuthLoginStatus } = useQueryGeshuAgentOAuthLoginStatus()

    useEffect(() => {
        const error = searchParams.get("error")
        if (!error) return

        const description = searchParams.get("error_description") ?? undefined
        const providerId = searchParams.get("oauth_provider")
        toast.error(getOAuthLoginErrorMessage(providerId, error, description), { id: toastId })

        const nextSearchParams = new URLSearchParams(searchParams)
        nextSearchParams.delete("oauth_provider")
        nextSearchParams.delete("error")
        nextSearchParams.delete("error_description")

        const search = nextSearchParams.toString()
        window.history.replaceState(null, "", search ? `${pathname}?${search}` : pathname)
    }, [pathname, searchParams, toastId])

    async function onOAuthLogin(providerId: typeof GeshuOAuthProviderId | typeof GeshuAgentOAuthProviderId) {
        if (pendingProviderId) return

        const isAgent = providerId === GeshuAgentOAuthProviderId
        const status = isAgent ? geshuAgentOAuthLoginStatus : geshuOAuthLoginStatus

        if (!status?.ready) {
            toast.error(isAgent ? "暂时无法使用 geshu-agent 登录，请联系管理员处理。" : "暂时无法使用格数账号登录，请联系管理员处理。")
            return
        }

        setPendingProviderId(providerId)
        toast.loading(isAgent ? "正在跳转 geshu-agent..." : "正在跳转账号平台...", { id: toastId })

        try {
            const callbackURL = getSafeInternalCallbackUrl(searchParams.get("from"))
            const errorSearchParams = new URLSearchParams()

            if (callbackURL !== "/") errorSearchParams.set("from", callbackURL)
            if (isAgent) errorSearchParams.set("source", "login")

            const errorCallbackPathname = isAgent ? "/bind-geshu-agent" : "/login"
            const errorSearch = errorSearchParams.toString()
            const response = await authClient.signIn.oauth2({
                providerId,
                callbackURL,
                errorCallbackURL: errorSearch ? `${errorCallbackPathname}?${errorSearch}` : errorCallbackPathname,
            })

            if (response.error) throw new Error(response.error.message || (isAgent ? "geshu-agent 登录失败" : "账号平台登录失败"))
            toast.dismiss(toastId)
        } catch (error) {
            toast.error(getErrorMessage(error), { id: toastId })
        } finally {
            setPendingProviderId(undefined)
        }
    }

    const isGeshuOAuthVisible = geshuOAuthLoginStatus?.enabled === true
    const isGeshuOAuthReady = geshuOAuthLoginStatus?.ready === true
    const isGeshuAgentOAuthVisible = geshuAgentOAuthLoginStatus?.ready === true

    return (
        <Card>
            <CardHeader>
                <CardTitle>登录</CardTitle>
                <CardDescription>使用手机号验证码、格数账号或 geshu-agent 进入系统。</CardDescription>
            </CardHeader>
            <CardContent>
                <PhoneLoginForm onLoginSuccess={() => router.refresh()}>
                    {isGeshuOAuthVisible && (
                        <Button
                            className="w-full"
                            type="button"
                            variant="outline"
                            title={isGeshuOAuthReady ? undefined : "暂时无法使用格数账号登录"}
                            disabled={!isGeshuOAuthReady || !!pendingProviderId}
                            onClick={() => void onOAuthLogin(GeshuOAuthProviderId)}
                        >
                            {pendingProviderId === GeshuOAuthProviderId && <LoaderCircleIcon className="animate-spin" />}
                            格数账号登录
                        </Button>
                    )}
                    {isGeshuAgentOAuthVisible && (
                        <Button
                            className="w-full"
                            type="button"
                            variant="outline"
                            disabled={!!pendingProviderId}
                            onClick={() => void onOAuthLogin(GeshuAgentOAuthProviderId)}
                        >
                            {pendingProviderId === GeshuAgentOAuthProviderId && <LoaderCircleIcon className="animate-spin" />}
                            geshu-agent 登录
                        </Button>
                    )}
                </PhoneLoginForm>
            </CardContent>
        </Card>
    )
}

export default Page
