import { IsNever } from "deepsea-tools"
import { $ZodType } from "zod/v4/core"

import { FilterConfig } from "./createFilter"
import { RateLimitConfig } from "./createRateLimit"
import { defineResponseFnMetadata, OriginalResponseFn, ResponseFnMetadata, RouteBodyType, RouteConfig } from "./createResponseFn"

export interface CreateSharedFnParams<TParam = never, TPathname extends string = never, TRouteBodyType extends RouteBodyType = "json"> {
    name: string
    schema?: $ZodType<TParam>
    filter?: FilterConfig
    rateLimit?: boolean | RateLimitConfig
    route?: RouteConfig<TPathname, TRouteBodyType>
}

type GetParams<TParam> = IsNever<TParam> extends true ? [] : [TParam]

export function createSharedFn<TParam = never, TPathname extends string = never, TRouteBodyType extends RouteBodyType = "json">(
    params: CreateSharedFnParams<TParam, TPathname, TRouteBodyType>,
): <TParams extends GetParams<TParam>, TData>(fn: (...args: TParams) => Promise<TData>) => OriginalResponseFn<TParams, TData, TPathname, TRouteBodyType> {
    function getSharedFn<TParams extends GetParams<TParam>, TData>(fn: (...args: TParams) => Promise<TData>) {
        return defineResponseFnMetadata(fn, params as ResponseFnMetadata<TParams, TPathname, TRouteBodyType>)
    }

    return getSharedFn
}
