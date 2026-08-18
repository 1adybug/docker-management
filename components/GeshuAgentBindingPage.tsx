"use client"

import { type FC, useEffect, useId, useState } from "react"

import { Button, Card, message } from "antd"
import { getErrorMessage } from "deepsea-tools"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { PhoneLoginForm } from "@/components/PhoneLoginForm"

import { GeshuAgentOAuthProviderId } from "@/constants"

import { useQueryGeshuAgentOAuthLoginStatus } from "@/hooks/useQueryGeshuAgentOAuthLoginStatus"

import { authClient } from "@/utils/authClient"
import { getSafeInternalCallbackUrl } from "@/utils/getSafeInternalCallbackUrl"

import { useUser } from "./UserProvider"

const LinkResultSearchParam = "geshu_agent_link"

const OAuthUnboundErrors = new Set(["signup_disabled", "account_not_linked"])

const OAuthBindingErrorMessage = {
    account_already_linked_to_different_user: "该格数智能体账户已绑定其他本平台账户，不能重复绑定。",
    unable_to_link_account: "格数智能体账户绑定失败，请稍后重试。",
    oauth_code_verification_failed: "本次授权已失效，请重新绑定。",
    user_info_is_missing: "格数智能体没有返回账户标识，请重新绑定。",
    id_is_missing: "格数智能体没有返回标准 sub，请联系管理员处理。",
    issuer_mismatch: "格数智能体授权响应来源不正确，请联系管理员处理。",
    issuer_missing: "格数智能体授权响应缺少来源标识，请联系管理员处理。",
} as const

function getOAuthBindingErrorMessage(error: string, description?: string) {
    return OAuthBindingErrorMessage[error as keyof typeof OAuthBindingErrorMessage] || description || "格数智能体账户绑定没有成功，请重新尝试。"
}

export const GeshuAgentBindingPage: FC = () => {
    const messageKey = useId()
    const pathname = usePathname()
    const router = useRouter()
    const searchParams = useSearchParams()
    const user = useUser()
    const [isLinkPending, setIsLinkPending] = useState(false)

    const { data: loginStatus } = useQueryGeshuAgentOAuthLoginStatus()

    useEffect(() => {
        const error = searchParams.get("error")
        const linkResult = searchParams.get(LinkResultSearchParam)
        if (!error && !linkResult) return

        const description = searchParams.get("error_description") ?? undefined

        if (!linkResult && error && !OAuthUnboundErrors.has(error)) {
            const nextSearchParams = new URLSearchParams()
            nextSearchParams.set("oauth_provider", GeshuAgentOAuthProviderId)
            nextSearchParams.set("error", error)
            if (description) nextSearchParams.set("error_description", description)
            const callbackURL = getSafeInternalCallbackUrl(searchParams.get("from"))
            if (callbackURL !== "/") nextSearchParams.set("from", callbackURL)
            router.replace(`/login?${nextSearchParams}`)
            return
        }

        if (linkResult === "error") {
            message.open({
                key: messageKey,
                type: "error",
                content: error ? getOAuthBindingErrorMessage(error, description) : "格数智能体账户绑定没有成功，请重新尝试。",
            })
        }

        const nextSearchParams = new URLSearchParams(searchParams)
        nextSearchParams.delete(LinkResultSearchParam)
        nextSearchParams.delete("error")
        nextSearchParams.delete("error_description")

        const search = nextSearchParams.toString()
        window.history.replaceState(null, "", search ? `${pathname}?${search}` : pathname)
    }, [messageKey, pathname, router, searchParams])

    async function linkAccount() {
        if (isLinkPending) return

        if (!loginStatus?.ready) {
            message.error("暂时无法绑定格数智能体，请联系管理员处理。")
            return
        }

        setIsLinkPending(true)

        message.open({
            key: messageKey,
            type: "loading",
            content: "正在跳转格数智能体...",
            duration: 0,
        })

        try {
            const callbackURL = getSafeInternalCallbackUrl(searchParams.get("from"))
            const errorSearchParams = new URLSearchParams()
            errorSearchParams.set(LinkResultSearchParam, "error")

            if (callbackURL !== "/") errorSearchParams.set("from", callbackURL)

            const response = await authClient.linkSocial({
                provider: GeshuAgentOAuthProviderId,
                callbackURL,
                errorCallbackURL: `/bind-geshu-agent?${errorSearchParams}`,
            })

            if (response.error) throw new Error(response.error.message || "格数智能体账户绑定失败")
            message.destroy(messageKey)
        } catch (error) {
            message.open({
                key: messageKey,
                type: "error",
                content: getErrorMessage(error),
            })
        } finally {
            setIsLinkPending(false)
        }
    }

    const isOAuthReady = loginStatus?.ready === true

    if (user) {
        return (
            <Card title="绑定格数智能体" className="!mx-auto w-full max-w-sm">
                <p className="mb-4 text-sm text-neutral-500">当前本平台账户已登录，请继续完成格数智能体登录和授权。</p>
                <Button type="primary" block loading={isLinkPending} disabled={!isOAuthReady} onClick={() => void linkAccount()}>
                    继续绑定
                </Button>
                <Link href="/">
                    <Button className="mt-3" block type="text">
                        暂不绑定，进入系统
                    </Button>
                </Link>
            </Card>
        )
    }

    return (
        <Card title="绑定格数智能体" className="!mx-auto w-full max-w-sm">
            <p className="mb-4 text-sm text-neutral-500">当前格数智能体账户尚未关联本平台账户。请先登录本平台，随后完成授权绑定。</p>
            <PhoneLoginForm submitLabel="登录并继续绑定" disabled={!isOAuthReady} pending={isLinkPending} onLoginSuccess={linkAccount} />
        </Card>
    )
}
