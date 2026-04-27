import { styleText } from "node:util"

import { createFnWithMiddleware, Middleware, ResponseData } from "deepsea-tools"
import { isRedirectError } from "next/dist/client/components/redirect-error"
import { redirect } from "next/navigation"
import { NextResponse } from "next/server"
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

export const RouteBodyTypeValue = {
    JSON: "json",
    FormData: "formData",
} as const

export type RouteBodyType = (typeof RouteBodyTypeValue)[keyof typeof RouteBodyTypeValue]

export interface ExtendedResponseData<TData = unknown> extends ResponseData<TData> {
    code?: number
}

export interface RouteConfig<TPathname extends string = never, TRouteBodyType extends RouteBodyType = "json"> {
    pathname: TPathname
    bodyType?: TRouteBodyType
}

export interface ResponseFnMetadata<TParams extends [arg?: unknown], TPathname extends string = never, TRouteBodyType extends RouteBodyType = "json"> {
    name: string
    schema?: TParams extends [] ? undefined : $ZodType<TParams[0]>
    filter?: FilterConfig
    rateLimit?: boolean | RateLimitConfig
    route?: RouteConfig<TPathname, TRouteBodyType>
}

export interface OriginalResponseFn<
    TParams extends [arg?: unknown],
    TData,
    TPathname extends string = never,
    TRouteBodyType extends RouteBodyType = "json",
> extends ResponseFnMetadata<TParams, TPathname, TRouteBodyType> {
    (...args: TParams): Promise<TData>
}

export interface ResponseFn<
    TParams extends [arg?: unknown],
    TData,
    TPathname extends string = never,
    TRouteBodyType extends RouteBodyType = "json",
> extends ResponseFnMetadata<TParams, TPathname, TRouteBodyType> {
    (...args: TParams): Promise<ExtendedResponseData<TData>>
}

export interface RouteFn<
    TParams extends [arg?: unknown],
    TData,
    TPathname extends string = never,
    TRouteBodyType extends RouteBodyType = "json",
> extends ResponseFnMetadata<TParams, TPathname, TRouteBodyType> {
    (...args: TParams): Promise<ExtendedResponseData<TData>>
}

export interface RouteHandler {
    (request: Request, context?: unknown): Promise<Response>
}

export interface CreateRouteResult {
    POST: RouteHandler
}

const responseContextUser = Symbol("responseContextUser")

export interface ResponseFnContext {
    [key: string]: unknown
    [responseContextUser]?: Promise<User | undefined>
    error?: unknown
}

export type ResponseMiddleware<
    TParams extends [arg?: unknown] = [arg?: unknown],
    TData = unknown,
    TPathname extends string = never,
    TRouteBodyType extends RouteBodyType = "json",
> = Middleware<ResponseFn<TParams, TData, TPathname, TRouteBodyType>, ResponseFnContext>

export interface RouteFnContext extends ResponseFnContext {
    request?: Request
}

const globalResponseFnMiddlewares: ResponseMiddleware[] = []

export function defineResponseFnMetadata<
    TParams extends [arg?: unknown],
    TData,
    TPathname extends string = never,
    TRouteBodyType extends RouteBodyType = "json",
>(
    target: (...args: TParams) => Promise<TData>,
    metadata: ResponseFnMetadata<TParams, TPathname, TRouteBodyType>,
): OriginalResponseFn<TParams, TData, TPathname, TRouteBodyType> {
    Object.defineProperty(target, "name", { value: metadata.name })
    Object.defineProperty(target, "schema", { value: metadata.schema })
    Object.defineProperty(target, "filter", { value: metadata.filter })
    Object.defineProperty(target, "rateLimit", { value: metadata.rateLimit })
    Object.defineProperty(target, "route", { value: metadata.route })
    return target as OriginalResponseFn<TParams, TData, TPathname, TRouteBodyType>
}

async function getCachedCurrentUser(context: ResponseFnContext) {
    if (!context[responseContextUser]) context[responseContextUser] = getCurrentUser()
    return context[responseContextUser]
}

export interface ErrorResponseContextFn {
    name: string
}

export interface ErrorResponseContext extends ResponseFnContext {
    args: unknown[]
    fn: ErrorResponseContextFn
}

function getResponseError(context: ResponseFnContext, result: ExtendedResponseData<unknown>) {
    if (context.error) return context.error
    if (result.message instanceof Error) return result.message
    if (result.message !== undefined) return new Error(String(result.message))

    return new Error("未知错误")
}

function getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : String(error)
}

function getErrorCode(error: unknown) {
    if (error instanceof ClientError && typeof error.code === "number") return error.code
    return 500
}

function getResponseCode(context: ResponseFnContext, result?: ExtendedResponseData<unknown>) {
    if (context.error) return getErrorCode(context.error)
    if (typeof result?.code === "number") return result.code
    return 500
}

function createSuccessResponse<TData>(data: TData): ExtendedResponseData<TData> {
    return {
        success: true,
        data,
        message: undefined,
        code: 200,
    }
}

function createErrorResponse(context: ResponseFnContext, error: unknown): ExtendedResponseData<never> {
    context.error = error

    return {
        success: false,
        data: undefined,
        message: getErrorMessage(error),
        code: getResponseCode(context),
    }
}

async function handleResponseError(context: ErrorResponseContext, error: unknown) {
    if (isRedirectError(error)) throw error

    console.error(styleText("red", getErrorMessage(error)))
    console.error(error)

    void addErrorLog({
        action: context.fn.name,
        args: context.args,
        error,
    })

    if (error instanceof ClientError && error.code === 401) redirect(LoginPathname)

    return createErrorResponse(context, error)
}

function getRouteBodyType<TParams extends [arg?: unknown], TData, TPathname extends string = never, TRouteBodyType extends RouteBodyType = "json">(
    fn: OriginalResponseFn<TParams, TData, TPathname, TRouteBodyType>,
) {
    return fn.route?.bodyType ?? RouteBodyTypeValue.JSON
}

async function getRouteInputArg<TParams extends [arg?: unknown], TData, TPathname extends string = never, TRouteBodyType extends RouteBodyType = "json">(
    request: Request,
    fn: OriginalResponseFn<TParams, TData, TPathname, TRouteBodyType>,
) {
    const bodyType = getRouteBodyType(fn)

    if (bodyType === RouteBodyTypeValue.FormData) {
        try {
            return await request.formData()
        } catch (error) {
            throw new ClientError({
                message: "读取 FormData 失败",
                code: 400,
                origin: error,
            })
        }
    }

    try {
        const text = await request.text()
        if (!text.trim()) return undefined

        return JSON.parse(text) as unknown
    } catch (error) {
        throw new ClientError({
            message: "请求体不是有效的 JSON",
            code: 400,
            origin: error,
        })
    }
}

async function getRouteArgs<TParams extends [arg?: unknown], TData, TPathname extends string = never, TRouteBodyType extends RouteBodyType = "json">(
    request: Request,
    fn: OriginalResponseFn<TParams, TData, TPathname, TRouteBodyType>,
) {
    if (getRouteBodyType(fn) === RouteBodyTypeValue.FormData) {
        if (fn.length === 0 && !fn.schema) return [] as unknown as TParams
        return [await getRouteInputArg(request, fn)] as unknown as TParams
    }

    const arg = await getRouteInputArg(request, fn)
    if (arg === undefined) return [] as unknown as TParams

    return [arg] as unknown as TParams
}

const responseErrorMiddleware: ResponseMiddleware = async function responseErrorMiddleware(context, next) {
    try {
        await next()

        if (context.result?.success !== false) return

        void addErrorLog({
            action: context.fn.name,
            args: context.args,
            error: getResponseError(context, context.result),
        })
    } catch (error) {
        context.result = await handleResponseError(context, error)
    }
}

const schemaMiddleware: ResponseMiddleware = async function schemaMiddleware(context, next) {
    const schema = context.fn.schema
    if (schema && context.args.length > 0) context.args = [getParser(schema)(context.args[0])] as unknown as typeof context.args

    await next()
}

const operationLogMiddleware: ResponseMiddleware = async function operationLogMiddleware(context, next) {
    await addOperationLog({
        action: context.fn.name,
        args: context.args,
    })

    await next()
}

const filterMiddleware: ResponseMiddleware = async function filterMiddleware(context, next) {
    const user = await getCachedCurrentUser(context)
    const filter = context.fn.filter ?? true

    if (typeof filter === "function") {
        if (!user) throw new ClientError({ message: "请先登录", code: 401 })
        if (!filter(user)) throw new ClientError({ message: "无权限", code: 403 })
    } else if (filter === true && !user) throw new ClientError({ message: "请先登录", code: 401 })

    await next()
}

const rateLimitMiddleware: ResponseMiddleware = async function rateLimitMiddleware(context, next) {
    if (!(await isGlobalRateLimitEnabled())) {
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
}

export function createResponseFn<TParams extends [arg?: unknown], TData, TPathname extends string = never, TRouteBodyType extends RouteBodyType = "json">(
    fn: OriginalResponseFn<TParams, TData, TPathname, TRouteBodyType>,
): ResponseFn<TParams, TData, TPathname, TRouteBodyType> {
    const response = async function response(...inputArgs: TParams) {
        const data = await fn(...inputArgs)
        return createSuccessResponse(data)
    }

    defineResponseFnMetadata(response, fn)

    const newResponse = createFnWithMiddleware.withContext<ResponseFnContext>()(response, {
        global: globalResponseFnMiddlewares as unknown as ResponseMiddleware<TParams, TData, TPathname, TRouteBodyType>[],
    })

    defineResponseFnMetadata(newResponse, fn)

    return newResponse
}

export function createRouteFn<TParams extends [arg?: unknown], TData, TPathname extends string = never, TRouteBodyType extends RouteBodyType = "json">(
    fn: OriginalResponseFn<TParams, TData, TPathname, TRouteBodyType>,
): RouteHandler {
    const route = async function route(...inputArgs: TParams) {
        const data = await fn(...inputArgs)
        return createSuccessResponse(data)
    }

    defineResponseFnMetadata(route, fn)

    const newRoute = createFnWithMiddleware.withContext<RouteFnContext>()(route as RouteFn<TParams, TData, TPathname, TRouteBodyType>, {
        global: globalResponseFnMiddlewares as unknown as RouteMiddleware<TParams, TData, TPathname, TRouteBodyType>[],
    })

    defineResponseFnMetadata(newRoute, fn)

    async function POST(request: Request) {
        if (!fn.route) return NextResponse.json({ success: false, data: undefined, message: "Not Found", code: 404 }, { status: 404 })

        try {
            const args = await getRouteArgs(request, fn)
            const result = await newRoute(...args)
            return NextResponse.json(result, { status: 200 })
        } catch (error) {
            const result = await handleResponseError(
                {
                    fn: newRoute,
                    args: [],
                    request,
                },
                error,
            )

            return NextResponse.json(result, { status: 200 })
        }
    }

    return POST
}

export function createRoute<TParams extends [arg?: unknown], TData, TPathname extends string = never, TRouteBodyType extends RouteBodyType = "json">(
    fn: OriginalResponseFn<TParams, TData, TPathname, TRouteBodyType>,
): CreateRouteResult {
    const POST = createRouteFn(fn)
    return { POST }
}

createResponseFn.use = function use(middleware: ResponseMiddleware) {
    globalResponseFnMiddlewares.push(middleware)
    return createResponseFn
}

export type RouteMiddleware<
    TParams extends [arg?: unknown],
    TData,
    TPathname extends string = never,
    TRouteBodyType extends RouteBodyType = "json",
> = Middleware<RouteFn<TParams, TData, TPathname, TRouteBodyType>, RouteFnContext>

createResponseFn.use(responseErrorMiddleware)
createResponseFn.use(rateLimitMiddleware)
createResponseFn.use(schemaMiddleware)
createResponseFn.use(filterMiddleware)
createResponseFn.use(operationLogMiddleware)
