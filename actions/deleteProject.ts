"use server"

import { createResponseFn } from "@/server/createResponseFn"

import { deleteProject } from "@/shared/deleteProject"

export const deleteProjectAction = createResponseFn(deleteProject)
