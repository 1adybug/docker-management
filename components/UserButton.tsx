import { ComponentProps, FC } from "react"

import { Button } from "antd"
import Link from "next/link"

export interface UserData {
    id: string
    name: string
}

export interface UserProps extends Omit<ComponentProps<typeof Link>, "children" | "href"> {
    data: UserData
}

const UserButton: FC<UserProps> = ({ data: { id, name }, ...rest }) => (
    <Link href={`/user/?id=${id}`} {...rest}>
        <Button color="primary" variant="text" className="h-6 min-w-[none] [&:not(:last-child)]:mr-2" size="small">
            {name}
        </Button>
    </Link>
)

export default UserButton
