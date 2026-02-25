"use server"

import { createResponseFn } from "@/server/createResponseFn"

import { addProject } from "@/shared/addProject"

export const addProjectAction = createResponseFn(addProject)
