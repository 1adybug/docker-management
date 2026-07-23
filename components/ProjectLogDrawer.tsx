import type { FC } from "react"

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"

import { ansiToHtml } from "@/utils/ansi"

export interface ProjectLogDrawerProps {
    name?: string
    content?: string
    open?: boolean
    titleSuffix?: string
    emptyDescription?: string
    onClose?: () => void
}

export const ProjectLogDrawer: FC<ProjectLogDrawerProps> = ({ name, content, open, titleSuffix = "日志", emptyDescription = "暂无日志", onClose }) => (
    <Sheet open={open} onOpenChange={nextOpen => !nextOpen && onClose?.()}>
        <SheetContent className="w-[min(92vw,45rem)] gap-0 p-0 sm:max-w-3xl">
            <SheetHeader className="border-b px-6 py-5 pr-14">
                <SheetTitle>{name ? `${name} ${titleSuffix}` : titleSuffix}</SheetTitle>
                <SheetDescription className="sr-only">查看项目{titleSuffix}</SheetDescription>
            </SheetHeader>
            <div className="min-h-0 flex-auto overflow-y-auto p-6">
                {content ? (
                    <pre
                        className="whitespace-pre-wrap break-words rounded-2xl bg-neutral-950 px-4 py-3 text-xs text-neutral-100"
                        dangerouslySetInnerHTML={{ __html: ansiToHtml(content) }}
                    />
                ) : (
                    <div className="flex min-h-40 items-center justify-center text-sm text-muted-foreground">{emptyDescription}</div>
                )}
            </div>
        </SheetContent>
    </Sheet>
)
