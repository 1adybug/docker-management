import { createRequestFn } from "deepsea-tools"

import { deleteProjectAction } from "@/actions/deleteProject"

import { createUseDeleteProject } from "@/presets/createUseDeleteProject"

export const deleteProjectClient = createRequestFn(deleteProjectAction)

export const useDeleteProject = createUseDeleteProject(deleteProjectClient)
