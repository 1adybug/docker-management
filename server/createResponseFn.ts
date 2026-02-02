import { styleText } from "node:util"

import { assignFnName, createFnWithMiddleware, Middleware, ResponseData } from "deepsea-tools"
import { isRedirectError } from "next/dist/client/components/redirect-error"
import { redirect } from "next/navigation"
import { $ZodType } from "zod/v4/core"

import { LoginPathname } from "@/constants"

import { User } from "@/prisma/generated/client"

import { getParser } from "@/schemas"

import { addErrorLog } from "@/server/addErrorLog"
import { addOperationLog } from "@/server/addOperationLog"
import { getCurrentUser } from "@/server/getCurrentUser"

import { ClientError } from "@/utils/clientError"

export interface OriginalResponseFn<T extends [arg?: unknown], P> {
    (...args: T): Promise<P>
    filter?: boolean | ((user: User) => boolean)
}

export interface ResponseFn<T extends [arg?: unknown], P> {
    (...args: T): Promise<ResponseData<P>>
    filter?: boolean | ((user: User) => boolean)
}

const globalResponseFnMiddlewares: Middleware[] = []

export interface CreateResponseFnParams<T extends [arg?: unknown], P> {
    fn: OriginalResponseFn<T, P>
    schema?: T extends [] ? undefined : $ZodType<T[0]>
    name?: string
}

export function createResponseFn<T extends [arg?: unknown], P>({ fn, schema, name }: CreateResponseFnParams<T, P>): ResponseFn<T, P> {
    async function response(...args: T) {
        args = args.slice(0, 1) as T
        if (args.length > 0 && schema) args = [getParser(schema)(args[0])] as unknown as T
        const data = await fn!(...args)
        return {
            success: true,
            data,
            message: undefined,
        }
    }

    assignFnName(response, name ?? fn)

    const newResponse = createFnWithMiddleware(response, {
        global: globalResponseFnMiddlewares,
    })

    assignFnName(newResponse, name ?? fn)

    Object.defineProperty(response, "filter", { value: fn.filter })

    return newResponse
}

createResponseFn.use = function use(middleware: Middleware<OriginalResponseFn<any, any>>) {
    globalResponseFnMiddlewares.push(middleware)
    return createResponseFn
}

createResponseFn.use(async context =>
    addOperationLog({
        action: context.fn.name,
        args: context.args,
    }))

createResponseFn.use(async (context, next) => {
    const user = await getCurrentUser()
    const filter = context.fn.filter ?? true

    if (typeof filter === "function") {
        if (!user) throw new ClientError({ message: "请先登录", code: 401 })
        if (!filter(user)) throw new ClientError({ message: "无权限", code: 403 })
    } else {
        if (filter === true && !user) throw new ClientError({ message: "请先登录", code: 401 })
    }

    await next()
})

createResponseFn.use(async (context, next) => {
    try {
        await next()
        if (context.result?.success !== false) return

        addErrorLog({
            action: context.fn.name,
            args: context.args,
            error: context.result?.error,
        })
    } catch (e) {
        const error = e as Error
        if (isRedirectError(error)) throw error
        console.log(styleText("red", error.message))
        console.log(error)

        addErrorLog({
            action: context.fn.name,
            args: context.args,
            error,
        })

        if (error instanceof ClientError && error.code === 401) redirect(LoginPathname)
        context.result = {
            success: false,
            data: undefined,
            message: error.message,
        }
    }
})
