"use server"

import { createResponseFn } from "@/server/createResponseFn"

import { queryProject } from "@/shared/queryProject"

export const queryProjectAction = createResponseFn({
    fn: queryProject,
    name: "queryProject",
})
