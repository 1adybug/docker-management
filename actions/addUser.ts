"use server"

import { createResponseFn } from "@/server/createResponseFn"

import { addUser } from "@/shared/addUser"

export const addUserAction = createResponseFn(addUser)
