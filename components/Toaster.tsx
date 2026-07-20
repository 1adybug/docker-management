"use client"

import type { FC } from "react"

import { CircleCheckIcon, CircleXIcon, LoaderCircleIcon, XIcon } from "lucide-react"
import { Toaster as HotToaster, toast, ToastBar } from "react-hot-toast"

export const Toaster: FC = () => (
    <HotToaster
        containerStyle={{
            top: 12,
            right: 12,
            bottom: 12,
            left: 12,
        }}
        gutter={6}
        position="top-center"
        reverseOrder={false}
        toastOptions={{
            duration: 4000,
            style: {
                maxWidth: "min(24rem, calc(100vw - 1.5rem))",
                padding: "0.5rem 0.625rem",
                color: "hsl(var(--popover-foreground))",
                background: "hsl(var(--popover) / 0.95)",
                border: "1px solid hsl(var(--border) / 0.6)",
                borderRadius: "calc(var(--radius) * 1.8)",
                boxShadow: "0 4px 12px hsl(var(--foreground) / 0.1)",
            },
            success: {
                duration: 3500,
                icon: <CircleCheckIcon className="size-4 text-emerald-600 dark:text-emerald-400" />,
            },
            error: {
                duration: 5000,
                icon: <CircleXIcon className="size-4 text-destructive" />,
            },
            loading: {
                duration: Infinity,
                icon: <LoaderCircleIcon className="size-4 animate-spin text-primary" />,
            },
        }}
    >
        {currentToast => (
            <ToastBar toast={currentToast}>
                {({ icon, message }) => (
                    <div className="flex min-w-0 items-center gap-2">
                        <span className="flex size-4 flex-none items-center justify-center">{icon}</span>
                        <div className="min-w-0 flex-1 text-sm font-medium leading-4">{message}</div>
                        {currentToast.type !== "loading" && (
                            <button
                                className="ml-0.5 inline-flex size-6 flex-none items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                type="button"
                                aria-label="关闭通知"
                                onClick={() => toast.dismiss(currentToast.id)}
                            >
                                <XIcon className="size-3" />
                            </button>
                        )}
                    </div>
                )}
            </ToastBar>
        )}
    </HotToaster>
)
