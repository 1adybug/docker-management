import type { ComponentProps, FC } from "react"

import Link from "next/link"

import { Button } from "@/components/ui/button"

export interface UserData {
    id: string
    name: string
}

export interface UserButtonProps extends Omit<ComponentProps<typeof Button>, "children" | "nativeButton" | "render"> {
    data: UserData
}

export const UserButton: FC<UserButtonProps> = ({ data: { id, name }, ...rest }) => (
    <Button render={<Link href={`/admin/user?id=${id}`} />} variant="link" size="xs" nativeButton={false} {...rest}>
        {name}
    </Button>
)
