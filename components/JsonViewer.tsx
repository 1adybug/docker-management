"use client"

import type { ComponentProps, FC } from "react"

import JsonView from "@uiw/react-json-view"
import { darkTheme } from "@uiw/react-json-view/dark"
import { lightTheme } from "@uiw/react-json-view/light"
import { type StrictOmit, clsx } from "deepsea-tools"
import { useTheme } from "next-themes"

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

export const JsonViewer: FC<JsonViewerProps> = ({ className, style, value, ...rest }) => {
    const { resolvedTheme } = useTheme()

    if (value === null || typeof value !== "object") {
        return (
            <div className={clsx("whitespace-pre-wrap break-all !font-sans", className)} style={style}>
                {String(value)}
            </div>
        )
    }

    return (
        <JsonView
            className={clsx("!font-sans", className)}
            style={{ ...(resolvedTheme === "dark" ? darkTheme : lightTheme), ...style }}
            value={value}
            displayDataTypes={false}
            {...rest}
        >
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
