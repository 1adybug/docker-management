"use server"

import { addProjectSchema } from "@/schemas/addProject"

import { createResponseFn } from "@/server/createResponseFn"

import { addProject } from "@/shared/addProject"

export const addProjectAction = createResponseFn({
    fn: addProject,
    schema: addProjectSchema,
    name: "addProject",
})
