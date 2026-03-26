import { IsNever, IsParamRequired } from "deepsea-tools"
import { parse } from "zod"

import { ExtendedResponseData, OriginalResponseFn } from "@/server/createResponseFn"

export type GetPathname<TPathname extends string> = `/${TPathname extends `/${infer WithoutFront}`
    ? WithoutFront extends `${infer WithoutEnd}/`
        ? WithoutEnd
        : WithoutFront
    : TPathname extends `${infer WithoutEnd}/`
      ? WithoutEnd
      : TPathname}`

export type IsRouteFn<TFn extends OriginalResponseFn<any, any, any, any>> = IsNever<NonNullable<TFn["route"]>["pathname"]> extends true ? false : true

// eslint-disable-next-line
export type CreateApiFnConfig<TFn extends OriginalResponseFn<any, any, any, any>> = {
    /** 如果没有传入 schema，传入的参数会被丢弃 */
    schema?: TFn["schema"]
} & (IsRouteFn<TFn> extends true
    ? // eslint-disable-next-line
      {
          pathname: GetPathname<NonNullable<TFn["route"]>["pathname"]>
      }
    : // eslint-disable-next-line
      {
          pathname?: undefined
      }) &
    (NonNullable<TFn["route"]>["bodyType"] extends "formData"
        ? // eslint-disable-next-line
          {
              bodyType: NonNullable<TFn["route"]>["bodyType"]
          }
        : // eslint-disable-next-line
          {
              bodyType?: NonNullable<TFn["route"]>["bodyType"]
          })

export type ApiFn<TFn extends OriginalResponseFn<any, any, any, any>> =
    IsParamRequired<TFn> extends true
        ? (params: Parameters<TFn>[0]) => Promise<Awaited<ReturnType<TFn>>>
        : (params?: Parameters<TFn>[0]) => Promise<Awaited<ReturnType<TFn>>>

let baseUrl: string | undefined

export function setHostname(newBaseUrl: string) {
    baseUrl = newBaseUrl
}

export function createApiFn<TFn extends OriginalResponseFn<any, any, any, any>>({ schema, pathname, bodyType }: CreateApiFnConfig<TFn>): ApiFn<TFn> {
    return async function request(params: any) {
        if (pathname === undefined) throw new Error("not found")

        if (bodyType === "formData" && !(params instanceof FormData)) throw new Error("params must be FormData")

        const body = params === undefined || params instanceof FormData ? params : schema ? JSON.stringify(parse(schema, params)) : undefined

        const headers = new Headers()

        if (typeof body === "string") headers.set("Content-Type", "application/json")

        const pathname2 = `/api/action/${pathname}`.replace(/(\/)(\/+)/g, "$1")

        const url = new URL(pathname2, baseUrl ?? location.origin)

        const response = await fetch(url, {
            method: "POST",
            body,
            headers,
        })

        const json: ExtendedResponseData<Awaited<ReturnType<TFn>>> = await response.json()

        if (!json.success) throw new Error(json.message as string)

        return json.data
    } as ApiFn<TFn>
}
