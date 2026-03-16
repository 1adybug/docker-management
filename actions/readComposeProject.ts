"use server"

import { createResponseFn } from "@/server/createResponseFn"

import { readComposeProject } from "@/shared/readComposeProject"

export const readComposeProjectAction = createResponseFn(readComposeProject)
