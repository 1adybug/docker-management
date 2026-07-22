"use client"

import type { ComponentProps, FC, ReactNode } from "react"

import { LoaderCircleIcon } from "lucide-react"

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"

export interface ConfirmButtonProps extends Omit<ComponentProps<typeof Button>, "onClick"> {
    title: string
    description?: ReactNode
    pending?: boolean
    confirmText?: string
    onConfirm: () => unknown | Promise<unknown>
}

export const ConfirmButton: FC<ConfirmButtonProps> = ({ children, title, description, pending, confirmText = "确认", onConfirm, ...rest }) => (
    <AlertDialog>
        <AlertDialogTrigger asChild>
            <Button disabled={pending} {...rest}>
                {children}
            </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>{title}</AlertDialogTitle>
                {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>取消</AlertDialogCancel>
                <AlertDialogAction onClick={() => void onConfirm()}>
                    {pending && <LoaderCircleIcon className="animate-spin" />}
                    {confirmText}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
)
