"use server"

import { updateProjectSchema } from "@/schemas/updateProject"

import { createResponseFn } from "@/server/createResponseFn"

import { updateProject } from "@/shared/updateProject"

export const updateProjectAction = createResponseFn({
    fn: updateProject,
    schema: updateProjectSchema,
    name: "updateProject",
})
