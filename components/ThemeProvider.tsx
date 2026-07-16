"use client"

import type { ComponentProps, FC } from "react"

import { ThemeProvider as NextThemesProvider } from "next-themes"

export interface ThemeProviderProps extends ComponentProps<typeof NextThemesProvider> {}

export const ThemeProvider: FC<ThemeProviderProps> = props => <NextThemesProvider {...props} />
