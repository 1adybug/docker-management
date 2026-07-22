import type { ComponentProps, FC } from "react"

import Link from "next/link"

import { Button } from "@/components/ui/button"

export interface UserData {
    id: string
    name: string
}

export interface UserButtonProps extends Omit<ComponentProps<typeof Button>, "asChild" | "children"> {
    data: UserData
}

export const UserButton: FC<UserButtonProps> = ({ data: { id, name }, ...rest }) => (
    <Button asChild variant="link" size="xs" {...rest}>
        <Link href={`/admin/user?id=${id}`}>{name}</Link>
    </Button>
)
