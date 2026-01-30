"use server"

import { deleteProjectSchema } from "@/schemas/deleteProject"

import { createResponseFn } from "@/server/createResponseFn"

import { deleteProject } from "@/shared/deleteProject"

export const deleteProjectAction = createResponseFn({
    fn: deleteProject,
    schema: deleteProjectSchema,
    name: "deleteProject",
})
