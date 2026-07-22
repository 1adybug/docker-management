"use client"

import type { FC, ReactNode } from "react"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

import { CssHasPolyfill } from "@/components/CssHasPolyfill"
import { Toaster } from "@/components/Toaster"

import { TooltipProvider } from "@/components/ui/tooltip"

import { ThemeProvider } from "./ThemeProvider"

export interface RegistryProps {
    children?: ReactNode
}

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 0,
        },
        mutations: {
            retry: 0,
        },
    },
})

export const Registry: FC<RegistryProps> = ({ children }) => (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <CssHasPolyfill />
        <QueryClientProvider client={queryClient}>
            <TooltipProvider>
                {children}
                <Toaster />
            </TooltipProvider>
        </QueryClientProvider>
    </ThemeProvider>
)
