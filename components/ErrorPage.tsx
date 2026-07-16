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
    <div className={clsx("bg-background grid min-h-full grid-cols-1 lg:grid-cols-2", className)} {...rest}>
        <div className="flex min-h-svh flex-col p-6 sm:p-8">
            <div className="flex items-center justify-between gap-4">
                <Brand />
                <ThemeSwitcher variant="outline" />
            </div>
            <div className="flex flex-auto items-center py-12">
                <div>
                    <div className="text-primary text-sm font-medium">错误代码 {code}</div>
                    <h1 className="mt-4 text-5xl font-semibold tracking-tight sm:text-6xl">{title}</h1>
                    <p className="text-muted-foreground mt-6 max-w-lg text-lg leading-8">{description}</p>
                    <Link className="text-primary mt-8 inline-flex items-center gap-2 text-sm font-medium hover:underline" href={href}>
                        <ArrowLeftIcon className="size-4" />
                        {link}
                    </Link>
                </div>
            </div>
        </div>
        <div className="hidden bg-cover bg-bottom lg:block" style={{ backgroundImage: `url(${image})` }} />
    </div>
)
