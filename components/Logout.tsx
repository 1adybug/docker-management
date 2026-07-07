"use client"

import { type ComponentProps, type FC, type MouseEvent as ReactMouseEvent, useId, useState } from "react"

import { Button, message } from "antd"
import { getErrorMessage } from "deepsea-tools"
import { useRouter } from "next/navigation"

import { authClient } from "@/utils/authClient"

export interface LogoutProps extends ComponentProps<typeof Button> {}

export const Logout: FC<LogoutProps> = ({ loading, onClick: _onClick, ...rest }) => {
    const key = useId()
    const router = useRouter()
    const [isSignOutPending, setIsSignOutPending] = useState(false)

    async function onSignOut() {
        if (isSignOutPending) return

        setIsSignOutPending(true)

        message.open({
            key,
            type: "loading",
            content: "注销中...",
            duration: 0,
        })

        try {
            const response = await authClient.signOut({})

            if (response.error) throw new Error(response.error.message || "注销失败")

            message.open({
                key,
                type: "success",
                content: "已注销",
            })

            router.refresh()
        } catch (error) {
            message.open({
                key,
                type: "error",
                content: getErrorMessage(error),
            })
        } finally {
            setIsSignOutPending(false)
        }
    }

    function onClick(event: ReactMouseEvent<HTMLElement, MouseEvent>) {
        onSignOut()
        _onClick?.(event)
    }

    return <Button loading={loading || isSignOutPending} onClick={onClick} {...rest} />
}
