"use server"

import { createResponseFn } from "@/server/createResponseFn"

import { getProject } from "@/shared/getProject"

export const getProjectAction = createResponseFn(getProject)
