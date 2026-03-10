import { createRequestFn } from "deepsea-tools"

import { runProjectAction } from "@/actions/runProject"

import { createUseRunProject } from "@/presets/createUseRunProject"

export const runProjectClient = createRequestFn(runProjectAction)

export const useRunProject = createUseRunProject(runProjectClient)
