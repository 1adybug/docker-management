"use server"

import { createResponseFn } from "@/server/createResponseFn"

import { runComposeProject } from "@/shared/runComposeProject"

export const runComposeProjectAction = createResponseFn(runComposeProject)
