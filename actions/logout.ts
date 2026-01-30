"use server"

import { createResponseFn } from "@/server/createResponseFn"

import { logout } from "@/shared/logout"

export const logoutAction = createResponseFn({
    fn: logout,
    name: "logout",
})
