import { createRequestFn, flattenZodError, getErrorMessage, isZodError } from "deepsea-tools"
import { isRedirectError } from "next/dist/client/components/redirect-error"

createRequestFn.use(async (context, next) => {
    try {
        await next()
    } catch (error) {
        if (!isRedirectError(error)) {
            console.error(error)

            if (isZodError(error)) flattenZodError(error).forEach(item => message.error(item))
            else message.error(getErrorMessage(error))
        }

        throw error
    }
})
