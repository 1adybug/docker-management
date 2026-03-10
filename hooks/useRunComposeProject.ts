import { createRequestFn } from "deepsea-tools"

import { runComposeProjectAction } from "@/actions/runComposeProject"

import { createUseRunComposeProject } from "@/presets/createUseRunComposeProject"

export const runComposeProjectClient = createRequestFn(runComposeProjectAction)

export const useRunComposeProject = createUseRunComposeProject(runComposeProjectClient)
