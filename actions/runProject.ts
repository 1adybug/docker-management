"use server"

import { createResponseFn } from "@/server/createResponseFn"

import { runProject } from "@/shared/runProject"

export const runProjectAction = createResponseFn(runProject)
