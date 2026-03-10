import { createRequestFn } from "deepsea-tools"

import { addProjectAction } from "@/actions/addProject"

import { createUseAddProject } from "@/presets/createUseAddProject"

export const addProjectClient = createRequestFn(addProjectAction)

export const useAddProject = createUseAddProject(addProjectClient)
