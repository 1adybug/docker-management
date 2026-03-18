"use server"

import { createResponseFn } from "@/server/createResponseFn"

import { checkProjectStart } from "@/shared/checkProjectStart"

export const checkProjectStartAction = createResponseFn(checkProjectStart)
