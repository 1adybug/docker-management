"use client"

import { type FC, type ReactNode, createContext, useContext } from "react"

import type { User } from "@/prisma/generated/client"

export const UserContext = createContext<User | undefined>(undefined)

export function useUser() {
    const user = useContext(UserContext)
    return user
}

export interface UserProviderProps {
    value?: User
    children?: ReactNode
}

export const UserProvider: FC<UserProviderProps> = ({ value, children }) => <UserContext value={value}>{children}</UserContext>
