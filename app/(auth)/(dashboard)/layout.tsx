import { type FC, type ReactNode, Fragment } from "react"

import Header from "@/components/Header"

export interface LayoutProps {
    children?: ReactNode
}

const Layout: FC<LayoutProps> = ({ children }) => (
    <Fragment>
        <Header />
        <main className="h-[calc(100vh_-_64px)]">{children}</main>
    </Fragment>
)

export default Layout
