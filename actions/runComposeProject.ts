"use server"

import { runComposeProjectSchema } from "@/schemas/runComposeProject"

import { createResponseFn } from "@/server/createResponseFn"

import { runComposeProject } from "@/shared/runComposeProject"

export const runComposeProjectAction = createResponseFn({
    fn: runComposeProject,
    schema: runComposeProjectSchema,
    name: "runComposeProject",
})
