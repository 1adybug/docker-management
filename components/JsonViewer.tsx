"use client"

import type { ComponentProps, FC } from "react"

import JsonView from "@uiw/react-json-view"
import { type StrictOmit, clsx } from "deepsea-tools"

export interface JsonViewerProps extends StrictOmit<ComponentProps<typeof JsonView>, "children" | "displayDataTypes" | "value"> {
    value?: unknown
}

export interface JsonViewerArrowProps extends ComponentProps<"span"> {}

function renderArrow({ children, className, style, ...props }: JsonViewerArrowProps) {
    return (
        <span
            className={clsx("inline-flex h-[1em] w-[1em] items-center justify-center", className)}
            style={{ ...style, lineHeight: 1, position: "relative", top: 1 }}
            {...props}
        >
            {children}
        </span>
    )
}

export const JsonViewer: FC<JsonViewerProps> = ({ className, value, ...rest }) => {
    if (value === null || typeof value !== "object")
        return <div className={clsx("whitespace-pre-wrap break-all !font-['Noto_Sans_SC_Variable']", className)}>{String(value)}</div>

    return (
        <JsonView className={clsx("!font-['Noto_Sans_SC_Variable']", className)} value={value} displayDataTypes={false} {...rest}>
            <JsonView.Arrow render={renderArrow} />
            <JsonView.Quote render={() => <span />} />
            <JsonView.Row
                render={({ children, className, ...props }) => (
                    <div className={clsx("flex items-center", className)} {...props}>
                        <span className="inline-block w-[1em] flex-none" aria-hidden />
                        <span className="min-w-0">{children}</span>
                    </div>
                )}
            />
        </JsonView>
    )
}
