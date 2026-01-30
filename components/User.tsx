import { ComponentProps, FC } from "react"

import { Button } from "antd"
import Link from "next/link"

export interface UserData {
    id: string
    username: string
}

export interface UserProps extends Omit<ComponentProps<typeof Link>, "children" | "href"> {
    data: UserData
}

const User: FC<UserProps> = ({ data: { id, username }, ...rest }) => (
    <Link href={`/user-management/?id=${id}`} {...rest}>
        <Button color="primary" variant="text" className="h-6 min-w-[none] [&:not(:last-child)]:mr-2" size="small">
            {username}
        </Button>
    </Link>
)

export default User
