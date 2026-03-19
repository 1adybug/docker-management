import { NextRequest, NextResponse } from "next/server"

import { createRouteFn, OriginalResponseFn, RouteBodyType, RouteHandler } from "@/server/createResponseFn"

import { addProject } from "@/shared/addProject"
import { addUser } from "@/shared/addUser"
import { banUser } from "@/shared/banUser"
import { buildJarDockerImage } from "@/shared/buildJarDockerImage"
import { buildStaticDockerImage } from "@/shared/buildStaticDockerImage"
import { checkProjectStart } from "@/shared/checkProjectStart"
import { copyDockerImage } from "@/shared/copyDockerImage"
import { createFirstUser } from "@/shared/createFirstUser"
import { deleteDockerImage } from "@/shared/deleteDockerImage"
import { deleteProject } from "@/shared/deleteProject"
import { deleteUser } from "@/shared/deleteUser"
import { getProject } from "@/shared/getProject"
import { getUser } from "@/shared/getUser"
import { login } from "@/shared/login"
import { queryDockerContainer } from "@/shared/queryDockerContainer"
import { queryDockerImage } from "@/shared/queryDockerImage"
import { queryDockerImageDetail } from "@/shared/queryDockerImageDetail"
import { queryErrorLog } from "@/shared/queryErrorLog"
import { queryOperationLog } from "@/shared/queryOperationLog"
import { queryProject } from "@/shared/queryProject"
import { queryUser } from "@/shared/queryUser"
import { readComposeProject } from "@/shared/readComposeProject"
import { renameDockerImage } from "@/shared/renameDockerImage"
import { runComposeProject } from "@/shared/runComposeProject"
import { runDockerContainer } from "@/shared/runDockerContainer"
import { runProject } from "@/shared/runProject"
import { sendPhoneNumberOtp } from "@/shared/sendPhoneNumberOtp"
import { unbanUser } from "@/shared/unbanUser"
import { updateProject } from "@/shared/updateProject"
import { updateUser } from "@/shared/updateUser"
import { uploadDockerImage } from "@/shared/uploadDockerImage"

const routeMap = new Map<string, RouteHandler>()

function registerRoute<TParams extends [arg?: unknown], TData, TPathname extends string, TRouteBodyType extends RouteBodyType = "json">(
    fn: OriginalResponseFn<TParams, TData, TPathname, TRouteBodyType>,
) {
    if (!fn.route) return
    const pathname = fn.route.pathname.replace(/(^\/|\/$)/g, "")
    if (routeMap.has(pathname)) throw new Error(`pathname ${pathname} is duplicate`)
    routeMap.set(pathname, createRouteFn(fn))
}

registerRoute(addProject)
registerRoute(addUser)
registerRoute(banUser)
registerRoute(buildJarDockerImage)
registerRoute(buildStaticDockerImage)
registerRoute(checkProjectStart)
registerRoute(copyDockerImage)
registerRoute(createFirstUser)
registerRoute(deleteDockerImage)
registerRoute(deleteProject)
registerRoute(deleteUser)
registerRoute(getProject)
registerRoute(getUser)
registerRoute(login)
registerRoute(queryDockerContainer)
registerRoute(queryDockerImage)
registerRoute(queryDockerImageDetail)
registerRoute(queryErrorLog)
registerRoute(queryOperationLog)
registerRoute(queryProject)
registerRoute(queryUser)
registerRoute(readComposeProject)
registerRoute(renameDockerImage)
registerRoute(runComposeProject)
registerRoute(runDockerContainer)
registerRoute(runProject)
registerRoute(sendPhoneNumberOtp)
registerRoute(unbanUser)
registerRoute(updateProject)
registerRoute(updateUser)
registerRoute(uploadDockerImage)

export function POST(request: NextRequest) {
    const { pathname } = new URL(request.url)
    const routeHandler = routeMap.get(pathname.replace(/(^\/api\/action\/|\/$)/g, ""))

    if (!routeHandler) return NextResponse.json({ success: false, data: undefined, message: "Not Found", code: 404 }, { status: 404 })

    return routeHandler(request)
}
