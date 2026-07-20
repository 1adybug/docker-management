"use client"

import type { FC, ReactNode } from "react"

import { clsx } from "deepsea-tools"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

export interface InfoDialogProps {
    title?: string
    description?: string
    children?: ReactNode
    open?: boolean
    wide?: boolean
    onClose?: () => void
}

export const InfoDialog: FC<InfoDialogProps> = ({ title, description = "查看完整信息。", children, open = false, wide, onClose }) => (
    <Dialog open={open} onOpenChange={nextOpen => !nextOpen && onClose?.()}>
        <DialogContent
            className={clsx(
                "rounded-4xl sm:rounded-4xl [&>button]:inline-flex [&>button]:h-7 [&>button]:w-7 [&>button]:items-center [&>button]:justify-center [&>button]:rounded-2xl",
                wide && "sm:max-w-3xl",
            )}
        >
            <DialogHeader>
                <DialogTitle>{title}</DialogTitle>
                <DialogDescription>{description}</DialogDescription>
            </DialogHeader>
            <div className="max-h-[65vh] overflow-auto whitespace-pre-wrap break-words rounded-2xl bg-muted p-4">{children}</div>
            <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose}>
                    关闭
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
)
