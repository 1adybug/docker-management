import { ComponentProps, FC } from "react"

import { Drawer, Empty } from "antd"
import { clsx, StrictOmit } from "deepsea-tools"

export interface ProjectLogDrawerProps extends StrictOmit<ComponentProps<typeof Drawer>, "children" | "title" | "onClose"> {
    name?: string
    content?: string
    onClose?: () => void
}

const ProjectLogDrawer: FC<ProjectLogDrawerProps> = ({ name, content, open, className, onClose, ...rest }) => (
    <Drawer
        className={clsx("project-log-drawer", className)}
        title={name ? `${name} 日志` : "日志"}
        open={open}
        size={720}
        onClose={() => onClose?.()}
        {...rest}
    >
        {content ? (
            <pre className="whitespace-pre-wrap break-words rounded bg-neutral-950 px-4 py-3 text-xs text-white">{content}</pre>
        ) : (
            <Empty description="暂无日志" />
        )}
    </Drawer>
)

export default ProjectLogDrawer
