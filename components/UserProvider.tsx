"use client"

import { createContext, FC, ReactNode, useContext } from "react"

import { User } from "@/prisma/generated/client"

export const UserContext = createContext<User | undefined>(undefined)

export function useUser() {
    const user = useContext(UserContext)
    if (!user) throw new Error("useUser must be used within a UserProvider")
    return user
}

export interface UserProviderProps {
    value: User
    children?: ReactNode
}

const UserProvider: FC<UserProviderProps> = ({ value, children }) => <UserContext value={value}>{children}</UserContext>

export default UserProvider
