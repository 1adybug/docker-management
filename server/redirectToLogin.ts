import { redirect } from "next/navigation"

import { LoginPathname } from "@/constants"

import { getUrl } from "@/server/getUrl"

import { getPathnameAndSearchParams } from "@/utils/getPathnameAndSearchParams"

export async function redirectToLogin() {
    const url = await getUrl()
    const { pathname, searchParams } = getPathnameAndSearchParams(url)
    if (pathname === LoginPathname) return redirect(LoginPathname)
    return redirect(`${LoginPathname}?from=${encodeURIComponent(`${pathname}${searchParams.size > 0 ? `?${searchParams.toString()}` : ""}`)}`)
}
