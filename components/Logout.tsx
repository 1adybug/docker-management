"use client"

import { type ComponentProps, type FC, useId, useState } from "react"

import { getErrorMessage } from "deepsea-tools"
import { LoaderCircleIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"

import { authClient } from "@/utils/authClient"

export interface LogoutProps extends ComponentProps<typeof Button> {}

export const Logout: FC<LogoutProps> = ({ children = "注销", disabled, onClick: _onClick, ...rest }) => {
    const key = useId()
    const router = useRouter()
    const [isPending, setIsPending] = useState(false)

    async function onSignOut() {
        if (isPending) return

        setIsPending(true)
        toast.loading("注销中...", { id: key, duration: Infinity })

        try {
            const response = await authClient.signOut({})

            if (response.error) throw new Error(response.error.message || "注销失败")

            toast.success("已注销", { id: key })
            router.refresh()
        } catch (error) {
            toast.error(getErrorMessage(error), { id: key })
        } finally {
            setIsPending(false)
        }
    }

    return (
        <Button
            disabled={disabled || isPending}
            onClick={event => {
                void onSignOut()
                _onClick?.(event)
            }}
            {...rest}
        >
            {isPending && <LoaderCircleIcon className="animate-spin" />}
            {children}
        </Button>
    )
}
