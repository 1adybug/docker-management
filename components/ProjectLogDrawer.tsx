import { ComponentProps, FC } from "react"

import { Drawer, Empty } from "antd"
import { clsx, StrictOmit } from "deepsea-tools"

import { ansiToHtml } from "@/utils/ansi"

export interface ProjectLogDrawerProps extends StrictOmit<ComponentProps<typeof Drawer>, "children" | "title" | "onClose"> {
    name?: string
    content?: string
    titleSuffix?: string
    emptyDescription?: string
    onClose?: () => void
}

const ProjectLogDrawer: FC<ProjectLogDrawerProps> = ({
    name,
    content,
    open,
    className,
    titleSuffix = "日志",
    emptyDescription = "暂无日志",
    onClose,
    ...rest
}) => (
    <Drawer
        className={clsx("project-log-drawer", className)}
        title={name ? `${name} ${titleSuffix}` : titleSuffix}
        open={open}
        size={720}
        onClose={() => onClose?.()}
        {...rest}
    >
        {content ? (
            <pre
                className="whitespace-pre-wrap break-words rounded bg-neutral-950 px-4 py-3 text-xs text-neutral-100"
                dangerouslySetInnerHTML={{ __html: ansiToHtml(content) }}
            />
        ) : (
            <Empty description={emptyDescription} />
        )}
    </Drawer>
)

export default ProjectLogDrawer
