"use client"

import { type FC, useEffect, useId, useState } from "react"

import { IconLink, IconShieldCheck, IconUnlink } from "@tabler/icons-react"
import { Button, Card, message, Popconfirm, Tag } from "antd"
import { getErrorMessage } from "deepsea-tools"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { GeshuAgentOAuthProviderId } from "@/constants"

import { useQueryGeshuAgentOAuthLoginStatus } from "@/hooks/useQueryGeshuAgentOAuthLoginStatus"

import { authClient } from "@/utils/authClient"

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
    accountId?: string
}

function getOAuthLinkErrorMessage(error: string, description?: string) {
    return OAuthLinkErrorMessage[error as keyof typeof OAuthLinkErrorMessage] || description || "格数智能体账户绑定没有成功，请重新尝试。"
}

export const GeshuAgentAccountLinking: FC<GeshuAgentAccountLinkingProps> = ({ accountId: initialAccountId }) => {
    const messageKey = useId()
    const pathname = usePathname()
    const router = useRouter()
    const searchParams = useSearchParams()
    const [accountId, setAccountId] = useState(initialAccountId)
    const [isLinkPending, setIsLinkPending] = useState(false)
    const [isUnlinkPending, setIsUnlinkPending] = useState(false)

    const { data: loginStatus } = useQueryGeshuAgentOAuthLoginStatus()

    useEffect(() => void setAccountId(initialAccountId), [initialAccountId])

    useEffect(() => {
        const result = searchParams.get(LinkResultSearchParam)
        if (!result) return

        if (result === "success") {
            message.open({
                key: messageKey,
                type: "success",
                content: "格数智能体账户绑定成功",
            })
        } else {
            const error = searchParams.get("error")
            const description = searchParams.get("error_description") ?? undefined

            message.open({
                key: messageKey,
                type: "error",
                content: error ? getOAuthLinkErrorMessage(error, description) : "格数智能体账户绑定没有成功，请重新尝试。",
            })
        }

        const nextSearchParams = new URLSearchParams(searchParams)
        nextSearchParams.delete(LinkResultSearchParam)
        nextSearchParams.delete("error")
        nextSearchParams.delete("error_description")

        const search = nextSearchParams.toString()
        window.history.replaceState(null, "", search ? `${pathname}?${search}` : pathname)
    }, [messageKey, pathname, searchParams])

    async function linkAccount() {
        if (isLinkPending || !loginStatus?.ready) return

        setIsLinkPending(true)

        message.open({
            key: messageKey,
            type: "loading",
            content: "正在跳转格数智能体...",
            duration: 0,
        })

        try {
            const response = await authClient.linkSocial({
                provider: GeshuAgentOAuthProviderId,
                callbackURL: `/profile?${LinkResultSearchParam}=success`,
                errorCallbackURL: `/profile?${LinkResultSearchParam}=error`,
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

    async function unlinkAccount() {
        if (isUnlinkPending || !accountId) return

        setIsUnlinkPending(true)

        try {
            const response = await authClient.unlinkAccount({
                accountId,
            })

            if (response.error) throw new Error(response.error.message || "解除格数智能体账户绑定失败")

            setAccountId(undefined)
            message.success("已解除格数智能体账户绑定")
            router.refresh()
        } catch (error) {
            message.error(getErrorMessage(error))
        } finally {
            setIsUnlinkPending(false)
        }
    }

    if (!loginStatus?.ready) return null

    const linked = !!accountId

    return (
        <Card
            className="overflow-hidden [&_.ant-card-body]:p-4 sm:[&_.ant-card-body]:p-6 [&_.ant-card-head]:px-4 sm:[&_.ant-card-head]:px-6"
            title="格数智能体账户"
            extra={<Tag color={linked ? "blue" : "default"}>{linked ? "已绑定" : "未绑定"}</Tag>}
        >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="flex size-12 flex-none items-center justify-center rounded-lg bg-neutral-100 text-neutral-500">
                    {linked ? <IconShieldCheck size={24} className="text-blue-600" /> : <IconLink size={24} />}
                </div>
                <div className="min-w-0 flex-auto">
                    <div className="font-medium">{linked ? "当前本平台账户已关联格数智能体" : "尚未关联格数智能体"}</div>
                    <p className="mb-0 mt-1 text-sm text-neutral-500">
                        {linked
                            ? "解除绑定只会删除本平台的账户映射和令牌，不会删除本地账户资料，也不会更改格数智能体账户。"
                            : "绑定时会跳转到格数智能体完成授权。本平台不会使用手机号、邮箱或昵称自动匹配账户。"}
                    </p>
                </div>
                {linked ? (
                    <Popconfirm
                        title="解除格数智能体账户绑定？"
                        description="解除后将不能使用该账户登录；手机号登录和本平台资料不受影响。"
                        okText="解除绑定"
                        cancelText="取消"
                        onConfirm={() => void unlinkAccount()}
                    >
                        <Button className="flex-none" icon={<IconUnlink size={16} />} loading={isUnlinkPending}>
                            解除绑定
                        </Button>
                    </Popconfirm>
                ) : (
                    <Button className="flex-none" type="primary" icon={<IconLink size={16} />} loading={isLinkPending} onClick={() => void linkAccount()}>
                        绑定格数智能体
                    </Button>
                )}
            </div>
        </Card>
    )
}
