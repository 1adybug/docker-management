"use server"

import { runProjectSchema } from "@/schemas/runProject"

import { createResponseFn } from "@/server/createResponseFn"

import { runProject } from "@/shared/runProject"

export const runProjectAction = createResponseFn({
    fn: runProject,
    schema: runProjectSchema,
    name: "runProject",
})
