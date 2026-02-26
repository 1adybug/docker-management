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
import { FilterConfig } from "@/server/createFilter"
import { checkRateLimit, isGlobalRateLimitEnabled, RateLimitConfig } from "@/server/createRateLimit"
import { getCurrentUser } from "@/server/getCurrentUser"
import { getIp } from "@/server/getIp"

import { ClientError } from "@/utils/clientError"

export interface OriginalResponseFn<TParams extends [arg?: unknown], TData> {
    (...args: TParams): Promise<TData>
    schema?: TParams extends [] ? undefined : $ZodType<TParams[0]>
    filter?: FilterConfig
    rateLimit?: boolean | RateLimitConfig
}

export interface ResponseFn<TParams extends [arg?: unknown], TData> {
    (...args: TParams): Promise<ResponseData<TData>>
    schema?: TParams extends [] ? undefined : $ZodType<TParams[0]>
    filter?: FilterConfig
    rateLimit?: boolean | RateLimitConfig
}

const globalResponseFnMiddlewares: Middleware[] = []

const responseContextUser = Symbol("responseContextUser")

export interface ResponseContextWithUser {
    [responseContextUser]?: Promise<User | undefined>
}

async function getCachedCurrentUser(context: unknown) {
    const contextWithUser = context as ResponseContextWithUser
    if (!contextWithUser[responseContextUser]) contextWithUser[responseContextUser] = getCurrentUser()
    return contextWithUser[responseContextUser]
}

export function createResponseFn<TParams extends [arg?: unknown], TData>(fn: OriginalResponseFn<TParams, TData>): ResponseFn<TParams, TData> {
    async function response(...args: TParams) {
        args = args.slice(0, 1) as TParams
        const schema = fn.schema
        if (args.length > 0 && schema) args = [getParser(schema)(args[0])] as unknown as TParams
        const data = await fn!(...args)
        return {
            success: true,
            data,
            message: undefined,
        }
    }

    assignFnName(response, fn.name || fn)

    Object.defineProperty(response, "schema", { value: fn.schema })
    Object.defineProperty(response, "filter", { value: fn.filter })
    Object.defineProperty(response, "rateLimit", { value: fn.rateLimit })

    const newResponse = createFnWithMiddleware(response, {
        global: globalResponseFnMiddlewares,
    })

    assignFnName(newResponse, fn.name || fn)

    Object.defineProperty(newResponse, "schema", { value: fn.schema })
    Object.defineProperty(newResponse, "filter", { value: fn.filter })
    Object.defineProperty(newResponse, "rateLimit", { value: fn.rateLimit })

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
    const user = await getCachedCurrentUser(context)
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
    if (!isGlobalRateLimitEnabled()) {
        await next()
        return
    }

    const rateLimitResult = await checkRateLimit({
        context: {
            action: context.fn.name,
            args: context.args,
            user: await getCachedCurrentUser(context),
            ip: await getIp(),
        },
        rateLimit: context.fn.rateLimit,
    })

    if (rateLimitResult && !rateLimitResult.allowed) {
        throw new ClientError({
            message: rateLimitResult.message,
            code: 429,
        })
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
