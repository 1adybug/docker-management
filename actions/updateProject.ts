"use server"

import { createResponseFn } from "@/server/createResponseFn"

import { updateProject } from "@/shared/updateProject"

export const updateProjectAction = createResponseFn(updateProject)
