"use server"

import { createResponseFn } from "@/server/createResponseFn"

import { getUserImportTemplate } from "@/shared/getUserImportTemplate"

export const getUserImportTemplateAction = createResponseFn(getUserImportTemplate)
