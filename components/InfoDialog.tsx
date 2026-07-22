"use client"

import type { FC, ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

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
        <DialogContent className={wide ? "sm:max-w-3xl" : undefined}>
            <DialogHeader>
                <DialogTitle>{title}</DialogTitle>
                <DialogDescription>{description}</DialogDescription>
            </DialogHeader>
            <DialogBody>
                <div className="bg-muted rounded-2xl p-4 break-words whitespace-pre-wrap">{children}</div>
            </DialogBody>
            <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose}>
                    关闭
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
)
