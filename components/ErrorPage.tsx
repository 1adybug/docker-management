import type { ComponentProps, FC } from "react"

import { clsx } from "deepsea-tools"
import { ArrowLeftIcon } from "lucide-react"
import Link from "next/link"

import { Brand } from "@/components/Brand"
import { ThemeSwitcher } from "@/components/ThemeSwitcher"

export interface ErrorPageProps extends ComponentProps<"div"> {
    code: number | string
    title: string
    description: string
    href: string
    link: string
    image: string
}

export const ErrorPage: FC<ErrorPageProps> = ({ code, title, description, href, link, image, className, ...rest }) => (
    <div className={clsx("grid min-h-full grid-cols-1 bg-background lg:grid-cols-2", className)} {...rest}>
        <div className="flex min-h-screen flex-col p-6 supports-[min-height:100svh]:min-h-svh sm:p-8">
            <div className="flex items-center justify-between gap-4">
                <Brand />
                <ThemeSwitcher variant="outline" />
            </div>
            <div className="flex flex-auto items-center py-12">
                <div>
                    <div className="text-sm font-medium text-primary">错误代码 {code}</div>
                    <h1 className="mt-4 text-5xl font-semibold tracking-tight sm:text-6xl">{title}</h1>
                    <p className="mt-6 max-w-lg text-lg leading-8 text-muted-foreground">{description}</p>
                    <Link className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline" href={href}>
                        <ArrowLeftIcon className="size-4" />
                        {link}
                    </Link>
                </div>
            </div>
        </div>
        <div className="hidden bg-cover bg-bottom lg:block" style={{ backgroundImage: `url(${image})` }} />
    </div>
)
