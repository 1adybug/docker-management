"use client"

import { type FC, useEffect } from "react"

const observedAttributes = [
    "aria-checked",
    "aria-expanded",
    "aria-selected",
    "data-active",
    "data-checked",
    "data-disabled",
    "data-invalid",
    "data-orientation",
    "data-sidebar",
    "data-slot",
    "data-state",
    "data-variant",
    "role",
]

let initializePromise: Promise<void> | undefined

function initializeCssHasPolyfill() {
    if (CSS.supports("selector(:has(*))")) return Promise.resolve()
    if (initializePromise) return initializePromise

    initializePromise = import("css-has-pseudo/browser").then(({ default: cssHasPseudo }) => void cssHasPseudo(document, { observedAttributes }))

    return initializePromise
}

export const CssHasPolyfill: FC = () => {
    useEffect(() => void void initializeCssHasPolyfill(), [])

    return null
}
