"use server"

import { createResponseFn } from "@/server/createResponseFn"

import { login } from "@/shared/login"

export const loginAction = createResponseFn(login)
