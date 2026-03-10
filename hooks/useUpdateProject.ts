import { createRequestFn } from "deepsea-tools"

import { updateProjectAction } from "@/actions/updateProject"

import { createUseUpdateProject } from "@/presets/createUseUpdateProject"

export const updateProjectClient = createRequestFn(updateProjectAction)

export const useUpdateProject = createUseUpdateProject(updateProjectClient)
