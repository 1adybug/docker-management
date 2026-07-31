"use client"

import { type FC, useEffect, useId, useState } from "react"

import { getErrorMessage } from "deepsea-tools"
import { LinkIcon, LoaderCircleIcon, ShieldCheckIcon, UnlinkIcon } from "lucide-react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { ConfirmButton } from "@/components/ConfirmButton"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

import { GeshuAgentOAuthProviderId } from "@/constants"

import { useQueryGeshuAgentOAuthLoginStatus } from "@/hooks/useQueryGeshuAgentOAuthLoginStatus"

import { authClient } from "@/utils/authClient"
import { toast } from "@/utils/toast"

const LinkResultSearchParam = "geshu_agent_link"

const OAuthLinkErrorMessage = {
    account_already_linked_to_different_user: "该格数智能体账户已绑定其他本平台账户，不能重复绑定。",
    unable_to_link_account: "格数智能体账户绑定失败，请稍后重试。",
    oauth_code_verification_failed: "本次授权已失效，请重新绑定。",
    user_info_is_missing: "格数智能体没有返回账户标识，请重新绑定。",
    id_is_missing: "格数智能体没有返回标准 sub，请联系管理员处理。",
    issuer_mismatch: "格数智能体授权响应来源不正确，请联系管理员处理。",
    issuer_missing: "格数智能体授权响应缺少来源标识，请联系管理员处理。",
} as const

export interface GeshuAgentAccountLinkingProps {
    linked: boolean
}

function getOAuthLinkErrorMessage(error: string, description?: string) {
    return OAuthLinkErrorMessage[error as keyof typeof OAuthLinkErrorMessage] || description || "格数智能体账户绑定没有成功，请重新尝试。"
}

export const GeshuAgentAccountLinking: FC<GeshuAgentAccountLinkingProps> = ({ linked: initialLinked }) => {
    const toastId = useId()
    const pathname = usePathname()
    const router = useRouter()
    const searchParams = useSearchParams()
    const [linked, setLinked] = useState(initialLinked)
    const [isLinkPending, setIsLinkPending] = useState(false)
    const [isUnlinkPending, setIsUnlinkPending] = useState(false)
    const { data: loginStatus } = useQueryGeshuAgentOAuthLoginStatus()

    useEffect(() => void setLinked(initialLinked), [initialLinked])

    useEffect(() => {
        const result = searchParams.get(LinkResultSearchParam)
        if (!result) return

        if (result === "success") toast.success("格数智能体账户绑定成功", { id: toastId })
        else {
            const error = searchParams.get("error")
            const description = searchParams.get("error_description") ?? undefined
            toast.error(error ? getOAuthLinkErrorMessage(error, description) : "格数智能体账户绑定没有成功，请重新尝试。", { id: toastId })
        }

        const nextSearchParams = new URLSearchParams(searchParams)
        nextSearchParams.delete(LinkResultSearchParam)
        nextSearchParams.delete("error")
        nextSearchParams.delete("error_description")

        const search = nextSearchParams.toString()
        window.history.replaceState(null, "", search ? `${pathname}?${search}` : pathname)
    }, [pathname, searchParams, toastId])

    async function linkAccount() {
        if (isLinkPending || !loginStatus?.ready) return

        setIsLinkPending(true)
        toast.loading("正在跳转格数智能体...", { id: toastId })

        try {
            const response = await authClient.oauth2.link({
                providerId: GeshuAgentOAuthProviderId,
                callbackURL: `/profile?${LinkResultSearchParam}=success`,
                errorCallbackURL: `/profile?${LinkResultSearchParam}=error`,
            })

            if (response.error) throw new Error(response.error.message || "格数智能体账户绑定失败")
            toast.dismiss(toastId)
        } catch (error) {
            toast.error(getErrorMessage(error), { id: toastId })
        } finally {
            setIsLinkPending(false)
        }
    }

    async function unlinkAccount() {
        if (isUnlinkPending) return

        setIsUnlinkPending(true)

        try {
            const response = await authClient.unlinkAccount({
                providerId: GeshuAgentOAuthProviderId,
            })

            if (response.error) throw new Error(response.error.message || "解除格数智能体账户绑定失败")

            setLinked(false)
            toast.success("已解除格数智能体账户绑定")
            router.refresh()
        } catch (error) {
            toast.error(getErrorMessage(error))
        } finally {
            setIsUnlinkPending(false)
        }
    }

    if (!loginStatus?.ready) return null

    return (
        <Card>
            <CardHeader className="flex-row items-start justify-between space-y-0 border-b">
                <div className="space-y-1.5">
                    <CardTitle>格数智能体账户</CardTitle>
                    <CardDescription>使用显式授权维护本平台账户与格数智能体的一对一绑定。</CardDescription>
                </div>
                <Badge variant={linked ? "default" : "outline"}>{linked ? "已绑定" : "未绑定"}</Badge>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center">
                <div className="flex size-12 flex-none items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                    {linked ? <ShieldCheckIcon className="size-6 text-primary" /> : <LinkIcon className="size-6" />}
                </div>
                <div className="min-w-0 flex-auto">
                    <div className="font-medium">{linked ? "当前本平台账户已关联格数智能体" : "尚未关联格数智能体"}</div>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {linked
                            ? "解除绑定只会删除本平台的账户映射和令牌，不会删除本地账户资料，也不会更改格数智能体账户。"
                            : "绑定时会跳转到格数智能体完成授权。本平台不会使用手机号、邮箱或昵称自动匹配账户。"}
                    </p>
                </div>
                {linked ? (
                    <ConfirmButton
                        className="flex-none"
                        variant="outline"
                        title="解除格数智能体账户绑定？"
                        description="解除后将不能使用该账户登录；手机号登录和本平台资料不受影响。"
                        pending={isUnlinkPending}
                        confirmText="解除绑定"
                        onConfirm={unlinkAccount}
                    >
                        <UnlinkIcon />
                        解除绑定
                    </ConfirmButton>
                ) : (
                    <Button className="flex-none" disabled={isLinkPending} onClick={() => void linkAccount()}>
                        {isLinkPending ? <LoaderCircleIcon className="animate-spin" /> : <LinkIcon />}
                        绑定格数智能体
                    </Button>
                )}
            </CardContent>
        </Card>
    )
}
