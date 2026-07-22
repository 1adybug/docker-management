import { createRequestFn, flattenZodError, getErrorMessage, isZodError } from "deepsea-tools"
import { isRedirectError } from "next/dist/client/components/redirect-error"

import { toast } from "@/utils/toast"

import "./generated/polyfills"

createRequestFn.use(async (context, next) => {
    try {
        await next()
    } catch (error) {
        if (!isRedirectError(error)) {
            console.error(error)

            if (isZodError(error)) flattenZodError(error).forEach(item => toast.error(item))
            else toast.error(getErrorMessage(error))
        }

        throw error
    }
})
