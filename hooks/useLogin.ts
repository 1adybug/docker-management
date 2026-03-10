import { createRequestFn } from "deepsea-tools"

import { loginAction } from "@/actions/login"

import { createUseLogin } from "@/presets/createUseLogin"

export const loginClient = createRequestFn(loginAction)

export const useLogin = createUseLogin(loginClient)
