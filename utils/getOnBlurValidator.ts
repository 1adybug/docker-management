import type { AnyFieldApi } from "@tanstack/react-form"
import type { ZodType } from "zod"

interface OnBlurValidatorParams<TValue> {
    value: TValue
    fieldApi: AnyFieldApi
}

function isEmptyValue(value: unknown) {
    return value === null || value === undefined || (typeof value === "string" && value.trim() === "")
}

export function getOnBlurValidator<TValue>(schema: ZodType<TValue>) {
    return function onBlurValidator({ value, fieldApi }: OnBlurValidatorParams<TValue>) {
        if (fieldApi.form.state.submissionAttempts === 0 && isEmptyValue(value)) return undefined

        const result = schema.safeParse(value)
        return result.success ? undefined : result.error.issues
    }
}
