import { ComponentProps, FC } from "react"

import { clsx, StrictOmit } from "deepsea-tools"
import Link from "next/link"

export interface BrandClassNames {
    mainWrapper?: string
    link?: string
    logoWrapper?: string
    logo?: string
    text?: string
}

export interface BrandProps extends StrictOmit<ComponentProps<"h1">, "children"> {
    classNames?: BrandClassNames
}

const Brand: FC<BrandProps> = ({ classNames: { mainWrapper, link, logoWrapper, logo, text } = {}, className, ...rest }) => (
    <h1 className={clsx(mainWrapper, className)} {...rest}>
        <Link href="/" className={clsx("flex items-center gap-3", link)}>
            <div className={clsx("flex flex-none", logoWrapper)}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/docker.svg" alt="logo" width={32} className={clsx("h-8 w-8", logo)} />
            </div>
            <div className={clsx("text-lg font-bold", text)}>Docker Management</div>
        </Link>
    </h1>
)

export default Brand
