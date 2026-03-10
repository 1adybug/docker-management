import { IsNever, IsParamRequired } from "deepsea-tools"

import { ExtendedResponseData, OriginalResponseFn } from "@/server/createResponseFn"

export type GetPathname<TPathname extends string> = `/${TPathname extends `/${infer WithoutFront}`
    ? WithoutFront extends `${infer WithoutEnd}/`
        ? WithoutEnd
        : WithoutFront
    : TPathname extends `${infer WithoutEnd}/`
      ? WithoutEnd
      : TPathname}`

export type IsRouteFn<TFn extends OriginalResponseFn<any, any, any, any>> = IsNever<NonNullable<TFn["route"]>["pathname"]> extends true ? false : true

export type CreateApiFnConfig<TFn extends OriginalResponseFn<any, any, any, any>> = (IsRouteFn<TFn> extends true
    ? {
          pathname: GetPathname<NonNullable<TFn["route"]>["pathname"]>
      }
    : {
          pathname?: undefined
      }) &
    (NonNullable<TFn["route"]>["bodyType"] extends "formData"
        ? {
              bodyType: NonNullable<TFn["route"]>["bodyType"]
          }
        : {
              bodyType?: NonNullable<TFn["route"]>["bodyType"]
          })

export type ApiFn<TFn extends OriginalResponseFn<any, any, any, any>> =
    IsParamRequired<TFn> extends true
        ? (params: Parameters<TFn>[0]) => Promise<Awaited<ReturnType<TFn>>>
        : (params?: Parameters<TFn>[0]) => Promise<Awaited<ReturnType<TFn>>>

export function createApiFn<TFn extends OriginalResponseFn<any, any, any, any>>({ pathname, bodyType }: CreateApiFnConfig<TFn>): ApiFn<TFn> {
    return async function request(params: any) {
        if (pathname === undefined) throw new Error("not found")

        if (bodyType === "formData" && !(params instanceof FormData)) throw new Error("params must be FormData")

        const body = params === undefined || params instanceof FormData ? params : JSON.stringify(params)
        const headers = new Headers()
        if (typeof body === "string") headers.set("Content-Type", "application/json")

        const response = await fetch(`/api/action/${pathname}`, {
            method: "POST",
            body,
            headers,
        })

        const json: ExtendedResponseData<Awaited<ReturnType<TFn>>> = await response.json()

        if (!json.success) throw new Error(json.message as string)

        return json.data
    } as ApiFn<TFn>
}
