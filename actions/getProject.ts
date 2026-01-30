"use server"

import { getProjectSchema } from "@/schemas/getProject"

import { createResponseFn } from "@/server/createResponseFn"

import { getProject } from "@/shared/getProject"

export const getProjectAction = createResponseFn({
    fn: getProject,
    schema: getProjectSchema,
    name: "getProject",
})
